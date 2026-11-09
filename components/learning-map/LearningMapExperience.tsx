"use client";

import { useEffect, useMemo, useState } from "react";
import KnowledgeGraphLoader from "./KnowledgeGraphLoader";
import PathwayAttemptHistory from "@/components/explain-back/PathwayAttemptHistory";
import type { KnowledgeGraphData } from "@/lib/services/knowledge-graph.service";
import type { WalkthroughSnapshot, SourceExcerpt, Freshness } from "@/lib/pathways/shared";
import { RUBRIC, STOP_LABELS, selectCallBranches, projectPathGraph } from "@/lib/pathways/shared";
import type { pathwayAttempts, pathwayReviews, studyNodes, studyEdges } from "@/lib/db/schema";

type View = "walkthrough" | "map" | "study";
type StudyNode = typeof studyNodes.$inferSelect & { available: boolean; level: number };
type Learning = {
  reviews: Array<typeof pathwayReviews.$inferSelect>; attempts: Array<typeof pathwayAttempts.$inferSelect>;
  validTargets: string[];
  study: { nodes: StudyNode[]; edges: Array<typeof studyEdges.$inferSelect> };
};
const button = "rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-cyan-400";
const field = "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200";
function branchInput(value?: string): Record<string, string> {
  try { const v: unknown = JSON.parse(value ?? "{}"); return v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).slice(0, 24).filter(([, e]) => typeof e === "string")) : {}; } catch { return {}; }
}

export default function LearningMapExperience({ workspaceId, snapshot, graph, freshness, initial }: {
  workspaceId: string; snapshot: WalkthroughSnapshot; graph: KnowledgeGraphData; freshness: Freshness;
  initial: { view?: string; path?: string; step?: string; branches?: string };
}) {
  const [view, setView] = useState<View>(initial.view === "map" || initial.view === "study" ? initial.view : "walkthrough");
  const [pathId, setPathId] = useState(initial.path ?? snapshot.paths[0]?.id ?? "");
  const [stepId, setStepId] = useState(initial.step ?? "");
  const [choices, setChoices] = useState<Record<string, string>>(() => branchInput(initial.branches));
  const [visible, setVisible] = useState(6);
  const [preview, setPreview] = useState<{ targetId: string; line?: number } | null>(null);
  const [source, setSource] = useState<{ key: string; data?: SourceExcerpt; error?: string } | null>(null);
  const [learning, setLearning] = useState<Learning | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [scores, setScores] = useState<string[]>(["", "", "", "", ""]);
  const base = snapshot.paths.find(p => p.id === pathId) ?? snapshot.paths[0];
  const path = useMemo(() => base ? selectCallBranches(snapshot, base, choices) : undefined, [snapshot, base, choices]);
  const index = Math.max(0, path?.hops.findIndex(h => h.id === stepId) ?? 0);
  const hop = path?.hops[index];
  const target = preview ?? (hop ? { targetId: hop.targetId, line: hop.line } : null);
  const sourceKey = target ? `${target.targetId}:${target.line ?? 1}` : "";
  const sourceTargetId = target?.targetId;
  const sourceAnchorLine = target?.line;
  const projected = useMemo(() => projectPathGraph(graph, path), [graph, path]);
  const api = `/workspaces/${workspaceId}/pathway`;

  function url(nextView: View, nextPath = base?.id ?? "", nextStep = hop?.id ?? "", nextChoices = choices) {
    const location = new URL(window.location.href);
    location.searchParams.set("view", nextView);
    if (nextPath) location.searchParams.set("path", nextPath); else location.searchParams.delete("path");
    if (nextStep) location.searchParams.set("step", nextStep); else location.searchParams.delete("step");
    if (Object.keys(nextChoices).length) location.searchParams.set("branches", JSON.stringify(nextChoices)); else location.searchParams.delete("branches");
    window.history.pushState({}, "", location);
  }
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("view"); setView(v === "map" || v === "study" ? v : "walkthrough");
      setPathId(params.get("path") ?? snapshot.paths[0]?.id ?? ""); setStepId(params.get("step") ?? "");
      setChoices(branchInput(params.get("branches") ?? undefined)); setPreview(null); setVisible(24);
    };
    window.addEventListener("popstate", restore); return () => window.removeEventListener("popstate", restore);
  }, [snapshot]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(api, { signal: controller.signal, cache: "no-store" }).then(r => r.json()).then(r => {
      if (r.ok) setLearning(r.data); else setError(r.error);
    }).catch(e => { if (e.name !== "AbortError") setError("Learning history could not be loaded. Reload to retry."); });
    return () => controller.abort();
  }, [api]);
  useEffect(() => {
    if (!sourceTargetId || view === "study") return;
    const controller = new AbortController();
    const query = new URLSearchParams({ analysisId: snapshot.analysisId, targetId: sourceTargetId, anchorLine: String(sourceAnchorLine ?? 1) });
    fetch(`/workspaces/${workspaceId}/source?${query}`, { signal: controller.signal, cache: "no-store" }).then(r => r.json()).then(r => {
      setSource({ key: sourceKey, ...(r.ok ? { data: r.data } : { error: r.error }) });
    }).catch(e => { if (e.name !== "AbortError") setSource({ key: sourceKey, error: "Source could not be opened. Reload to retry." }); });
    return () => controller.abort();
  }, [workspaceId, snapshot.analysisId, sourceTargetId, sourceAnchorLine, sourceKey, view]);

  async function mutate(action: string, data: unknown) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, data }) });
      const result = await response.json();
      if (!result.ok) { setError(result.error); return; }
      setNotice(action === "attempt" ? `Explanation saved: ${result.data.score}/10 — ${result.data.ready ? "Self-assessed ready for this version" : "Needs review"}.` : "Saved.");
      const updated = await fetch(api, { cache: "no-store" }).then(r => r.json());
      if (updated.ok) setLearning(updated.data);
    } catch { setError("The change could not be saved. Try again."); }
    finally { setBusy(false); }
  }
  function selectStep(id: string) { setStepId(id); setPreview(null); url(view, base?.id, id); }
  const data = source?.key === sourceKey ? source.data : undefined;
  const sourceError = source?.key === sourceKey ? source.error : undefined;
  const pathInputs = { analysisId: snapshot.analysisId, pathId: base?.id, choices };
  const validPath = !!path && path.hops.every(h => learning?.validTargets.includes(h.targetId));
  const reviewed = path?.hops.filter(h => learning?.reviews.some(r => r.targetKey === h.id && r.contentVersion === snapshot.files.find(f => f.id === h.targetId)?.hash) && learning?.validTargets.includes(h.targetId)).length ?? 0;

  return <section className="rounded-xl border border-zinc-800 bg-[#0d1117] overflow-hidden" aria-label="Guided Learning Map">
    <div className="p-4 border-b border-zinc-800 space-y-3">
      <div><h2 className="text-base font-semibold text-zinc-100">Follow the code, one connection at a time</h2>
        <p className="text-sm text-zinc-400 mt-1">Choose a walkthrough, inspect why each file follows, then explain the connections.</p></div>
      <nav aria-label="Learning Map views" className="flex flex-wrap gap-2">
        {([["walkthrough", "Code walkthrough"], ["map", "Explore map"], ["study", "Study path"]] as const).map(([key, label]) => <button key={key} className={`${button} ${view === key ? "bg-cyan-950 border-cyan-700 text-cyan-200" : ""}`} aria-pressed={view === key} onClick={() => { setView(key); url(key); }}>{label}</button>)}
        <a className={`${button} ml-auto`} href={`/workspaces/${workspaceId}/flow`} download>Export flow.md</a>
      </nav>
      <p className="text-xs text-zinc-400">{snapshot.legacy ? "Older analysis: provenance and coverage are incomplete. Re-analyze for source verification and richer paths." : `Analyzed ${new Date(snapshot.analyzedAt!).toLocaleString("en-US")} · ${snapshot.coverage.scanned} scanned files · ${snapshot.coverage.astFiles} files inspected for static calls.`}</p>
      <p className="text-xs text-amber-300">{freshness === "metadata_matches" ? "No metadata changes detected within the scanned source set. Source excerpts are checked by content hash." : freshness === "changed" ? "Source changed since analysis. Refresh the workspace before assessing this version." : freshness === "unavailable" ? "Original source is unavailable. Saved walkthroughs remain readable." : "Source freshness is unknown."} {snapshot.coverage.truncated ? "Analysis reached its file limit; additional files were not scanned." : ""}</p>
      {snapshot.warning && <p className="text-xs text-amber-300">{snapshot.warning}</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {notice && <p role="status" className="text-sm text-cyan-200">{notice}</p>}
    </div>

    {view !== "study" && <div className="p-4 space-y-4">
      {snapshot.paths.length ? <>
        <label className="block text-xs text-zinc-300">Choose a starting walkthrough
          <select className={`${field} mt-2`} value={base?.id ?? ""} onChange={e => { setPathId(e.target.value); setStepId(""); setChoices({}); setPreview(null); setVisible(6); setAnswer(""); setScores(["", "", "", "", ""]); url(view, e.target.value, "", {}); }}>
            {snapshot.paths.map(p => <option key={p.id} value={p.id}>{p.title} — {p.kind === "static_call" ? "possible calls" : "suggested imports"}</option>)}
          </select></label>
        {initial.path && !snapshot.paths.some(p => p.id === initial.path) && <p className="text-xs text-amber-300">The linked walkthrough is unavailable in this analysis. Showing an available starting point.</p>}
        <p className="text-xs text-zinc-400 break-all">{base?.entry} · {snapshot.paths.filter(p => p.kind === "imports").length} import suggestions{snapshot.coverage.entryCount !== null ? ` from ${snapshot.coverage.entryCount} recognized entry files` : "; total entry coverage unknown"}. Possible calls are statically resolved; runtime execution and order are unverified.</p>
        {path && hop && <>
          <p className="text-xs text-zinc-500">{path.kind === "imports" ? "Import suggestions contain at most six files and eight starting recommendations." : "Possible-call walkthroughs contain at most 24 unique steps; source order is only a display tie-break."}</p>
          {view === "map" && <KnowledgeGraphLoader data={projected} activePath={path} activeFile={hop.file} />}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.65fr)] gap-4">
            <div>
              <p className="text-xs text-zinc-400 mb-3">Step {index + 1} of {path.hops.length} · {reviewed}/{path.hops.length} reviewed for matching source</p>
              <ol className="space-y-2" aria-label="Walkthrough steps">
                {path.hops.slice(0, Math.max(visible, index + 1)).map((h, i) => <li key={h.id}>
                  <button aria-current={h.id === hop.id ? "step" : undefined} onClick={() => selectStep(h.id)} className={`w-full text-left p-3 rounded-lg border ${h.id === hop.id ? "border-cyan-600 bg-cyan-950/40" : "border-zinc-800 hover:border-zinc-600"}`}>
                    <span className="text-xs text-cyan-300">{i + 1}. {i === 0 ? "Start here" : h.layer}</span>
                    <span className="block text-xs text-zinc-200 font-mono break-all mt-1">{h.file}</span>
                    {h.symbol && <span className="block text-xs text-zinc-400 mt-1">{h.symbolKind === "file_export" ? "File export: " : "Function: "}{h.symbol}</span>}
                  </button>{i < path.hops.length - 1 && <span aria-hidden="true" className="block pl-4 text-cyan-600">↓</span>}
                </li>)}
              </ol>
              {visible < path.hops.length && <button className={`${button} mt-2`} onClick={() => setVisible(n => n + 6)}>Show next six steps</button>}
              <p className="text-xs text-amber-200/80 mt-3">Last suggested step: {STOP_LABELS[path.stopReason]}</p>
              <div className="mt-3 flex gap-2"><button className={button} disabled={index === 0} onClick={() => selectStep(path.hops[index - 1].id)}>← Previous</button><button className={button} disabled={index >= path.hops.length - 1} onClick={() => selectStep(path.hops[index + 1].id)}>Next →</button></div>
            </div>
            <div className="min-w-0 space-y-4">
              <div className="rounded-lg border border-zinc-800 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-zinc-100">Why this file matters</h3>
                <p className="text-sm text-zinc-400">This step is classified as {hop.layer.toLowerCase()}.{index === 0 ? " It is the selected starting point for inspection." : " Its precise business purpose should be checked in the source."}</p>
                <h3 className="text-sm font-semibold text-zinc-100 pt-2">Why we go here next</h3>
                <p className="text-sm text-zinc-400">{!hop.evidence ? index === 0 ? "Start by inspecting this entry. The analyzer has not observed it running." : "This older analysis did not save transition evidence. Re-analyze to inspect it." : hop.evidence.kind === "static_call" ? `${hop.evidence.fromSymbol} contains a supported call site for ${hop.evidence.toSymbol}. This may execute; conditions and runtime order remain unverified.` : hop.evidence.basis === "syntax" ? "An import or re-export declaration links the previous file to this dependency. Its position here is a suggested reading order." : "A heuristic source scan found an import-like dependency. Check its statement before assuming the connection."}</p>
                {hop.evidence?.line && <button className={button} onClick={() => { const f = snapshot.files.find(f => f.file === hop.evidence!.from); if (f) setPreview({ targetId: f.id, line: hop.evidence!.line }); }}>Inspect {hop.evidence.kind === "imports" ? "import" : "call"} evidence · line {hop.evidence.line}</button>}
                <div className="flex flex-wrap gap-2 pt-2"><button className={button} onClick={() => setPreview(null)}>Open this step’s source</button><button className={button} disabled={busy || !learning?.validTargets.includes(hop.targetId)} onClick={() => mutate("review", { ...pathInputs, stepId: hop.id, targetId: hop.targetId })}>Mark step reviewed</button></div>
                <div className="flex gap-3 text-xs"><a className="text-violet-300 underline" href={`/workspaces/${workspaceId}/dsa-bridge`}>Concepts: {hop.concepts.length}</a><a className="text-amber-300 underline" href={`/workspaces/${workspaceId}/deep-review`}>Risk findings: {hop.risks.length}</a></div>
              </div>
              <section aria-label="Source excerpt" className="rounded-lg border border-zinc-800 overflow-hidden">
                <div className="px-3 py-2 bg-zinc-900 text-xs text-zinc-300 break-all">{data?.file ?? snapshot.files.find(f => f.id === target?.targetId)?.file ?? "Source"}</div>
                {sourceError ? <p role="status" className="p-4 text-xs text-amber-300">{sourceError}</p> : !data ? <p role="status" className="p-4 text-xs text-zinc-400">Loading source excerpt…</p> : <>
                  <p className="px-3 py-2 text-xs text-amber-200">{data.freshness === "matches" ? "Content matches this analysis." : data.freshness === "changed" ? "Current source differs from the saved analysis; saved line anchors need checking." : "Live source; this older analysis has no content hash to verify it."}</p>
                  <pre tabIndex={0} aria-label="Read-only source code with line numbers" className="text-xs overflow-auto max-h-[460px] bg-zinc-950 p-3 leading-6">{data.content.split("\n").map((line, i) => <span key={i} className={`block ${data.anchorLine === data.startLine + i ? "bg-cyan-950/70" : ""}`}><span className="inline-block w-10 text-zinc-600 select-none">{data.startLine + i}</span><code className="text-zinc-300">{line || " "}</code></span>)}</pre>
                  <div className="p-2 flex items-center gap-2"><span className="text-xs text-zinc-500">Lines {data.startLine}–{data.endLine} of {data.totalLines}</span><button className={button} disabled={data.startLine <= 1} onClick={() => setPreview({ targetId: target!.targetId, line: Math.max(1, data.startLine - 99) })}>Earlier</button><button className={button} disabled={data.endLine >= data.totalLines} onClick={() => setPreview({ targetId: target!.targetId, line: data.endLine + 21 })}>Later</button></div>
                </>}
              </section>
              <details className="rounded-lg border border-zinc-800 p-3"><summary className="text-sm text-zinc-300 cursor-pointer">Other dependencies and branches ({hop.alternatives.length})</summary>
                <p className="text-xs text-zinc-500 my-2">These are recorded relationships. Selection does not establish runtime order.</p>
                {hop.alternatives.map(e => <div key={e.id} className="flex flex-wrap items-center gap-2 my-3"><span className="text-xs text-zinc-300 font-mono break-all flex-1">{e.to}{e.toSymbol ? ` · ${e.toSymbol}` : ""}</span><button className={button} onClick={() => { const f = snapshot.files.find(f => f.file === e.to); if (f) setPreview({ targetId: f.id, line: e.toLine }); }}>Inspect file</button>{e.kind === "static_call" && <button className={button} onClick={() => { const next = { ...choices, [hop.id]: e.id }; setChoices(next); setPreview(null); url(view, base?.id, hop.id, next); }}>Follow branch</button>}</div>)}
                {!hop.alternatives.length && <p className="text-xs text-zinc-500">No alternatives were recorded. Coverage may be incomplete.</p>}
              </details>
            </div>
          </div>

          <form className="border-t border-zinc-800 pt-4 space-y-3" onSubmit={e => { e.preventDefault(); mutate("attempt", { ...pathInputs, answer, scores: scores.map(Number) }); }}>
            <h3 className="text-sm font-semibold text-zinc-100">Explain the walkthrough back</h3>
            <p className="text-xs text-zinc-400">Explain the entry, the connections and data boundary, a possible failure, and what remains unknown. Cite relative files and lines. This is a local self-assessment.</p>
            <label className="block text-xs text-zinc-300">Your explanation<textarea required maxLength={5000} rows={5} className={`${field} mt-2`} value={answer} onChange={e => setAnswer(e.target.value)} /></label>
            {RUBRIC.map((criterion, i) => <label className="grid sm:grid-cols-[1fr_200px] gap-2 text-xs text-zinc-300 items-center" key={criterion}><span>{i + 1}. {criterion}</span><select required className={field} value={scores[i]} onChange={e => setScores(old => old.map((v, n) => n === i ? e.target.value : v))}><option value="">Assess this point…</option><option value="0">0 · Not yet explained</option><option value="1">1 · Partial</option><option value="2">2 · Supported explanation</option></select></label>)}
            <p className="text-xs text-zinc-400">8/10 with points 2 and 5 fully supported gives “Self-assessed ready” when source matches. An unknown earns credit only if you identify the missing evidence and its consequence. Reading is not proof of mastery.</p>
            {!validPath && <p className="text-xs text-amber-300">Source is changed, unavailable, unverified, or still being checked. You can save an explanation; it will need review before readiness applies.</p>}
            {scores.some(s => s !== "" && Number(s) < 2) && <div className="rounded border border-amber-900/50 p-3 space-y-2">
              <p className="text-xs text-amber-200">Review the evidence for your gaps before revising:</p>
              {scores.map((s, i) => s !== "" && Number(s) < 2 ? <button type="button" key={i} className={`${button} mr-2`} onClick={() => { selectStep(path.hops[i === 0 ? 0 : i === 4 ? path.hops.length - 1 : Math.min(1, path.hops.length - 1)].id); setPreview(null); }}>Point {i + 1}: {i === 0 ? "entry" : i === 1 ? "connection evidence" : i === 2 ? "source boundary" : i === 3 ? "branches" : "stopping reason"}</button> : null)}
              {learning?.study.nodes.some(n => n.origin === "catalog" && path.hops.some(h => h.concepts.some(c => c.toLowerCase().includes(n.title.toLowerCase())))) && <button type="button" className={button} onClick={() => { setView("study"); url("study"); }}>Review matching concepts in your study path</button>}
            </div>}
            <button className={button} disabled={busy}>Save explanation and assessment</button>
          </form>
        </>}
      </> : <div className="space-y-3"><h3 className="text-sm text-zinc-200">No routed walkthroughs available</h3><p className="text-sm text-zinc-400">Manual maps and libraries may have no recognized route entries. Explore the dependencies or study the modules below. Re-analyze an imported workspace to update older analysis.</p><button className={button} onClick={() => { setView("map"); url("map"); }}>Explore dependency map</button>{view === "map" && <KnowledgeGraphLoader data={graph} />}</div>}
      <details className="border-t border-zinc-800 pt-3"><summary className="text-sm text-zinc-300 cursor-pointer">Saved explanations ({learning?.attempts.length ?? 0})</summary>
        <p className="text-xs text-zinc-500 my-2">Earlier versions remain here after analysis refresh. Each retry is a separate attempt.</p>
        <PathwayAttemptHistory attempts={learning?.attempts ?? []} currentVersion={path?.contentVersion} sourceMatches={validPath} />
      </details>
    </div>}

    {view === "study" && <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100">Choose prerequisites, then study in order</h3>
      <p className="text-sm text-zinc-400">Suggestions come from a local concept catalog, not code imports. Accept only the relationships useful to your learning. Position orders independent topics; arrows mean prerequisites.</p>
      <button className={button} disabled={busy} onClick={() => mutate("study_sync", {})}>Update suggestions from this project</button>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); mutate("study_node", { title: data.get("title"), position: Number(data.get("position")) }); }}><input className={field} name="title" required maxLength={100} aria-label="New study topic" placeholder="Add your own study topic" /><input className={`${field} max-w-24`} name="position" type="number" min={0} max={10000} defaultValue={0} aria-label="Study position" /><button className={button} disabled={busy}>Add</button></form>
      {learning?.study.nodes.length ? <>
        {[...new Set(learning.study.nodes.map(n => n.level))].sort((a, b) => a - b).map(level => <section key={level} className="rounded-lg border border-zinc-800 p-3"><h4 className="text-sm text-cyan-200 mb-3">{level === 0 ? "Start here · no accepted prerequisites" : `↓ Stage ${level + 1} · after the prerequisites above`}</h4>
          <ol className="space-y-3">{learning.study.nodes.filter(n => n.level === level).sort((a, b) => a.position - b.position || a.title.localeCompare(b.title)).map(n => <li key={n.id} className="rounded border border-zinc-800 p-3">
            <form className="flex flex-wrap gap-2 items-center" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); mutate("study_node", { id: n.id, title: data.get("title"), position: Number(data.get("position")) }); }}><input className={`${field} flex-1 min-w-40`} name="title" defaultValue={n.title} maxLength={100} required aria-label={`Rename ${n.title}`} /><label className="text-xs text-zinc-400">Position<input className={`${field} max-w-24 ml-2`} type="number" name="position" defaultValue={n.position} min={0} max={10000} /></label><button className={button} disabled={busy}>Save</button><button className={button} type="button" disabled={busy} onClick={() => mutate("study_delete", { id: n.id })}>Remove</button></form>
            <div className="flex flex-wrap gap-3 text-xs mt-2">
              {n.anchor.startsWith("module:") && <a className="text-cyan-300 underline" href={`#module-${n.anchor.slice(7)}`}>Read this module</a>}
              <a className="text-violet-300 underline" href={`/workspaces/${workspaceId}/dsa-bridge`}>Explore concepts</a>
              <a className="text-cyan-300 underline" href={`/workspaces/${workspaceId}/explain-back`}>Explain-back practice</a>
              <button className="text-cyan-300 underline" type="button" onClick={() => { setView("walkthrough"); url("walkthrough"); }}>Return to code walkthrough</button>
            </div>
            {!n.available && <p className="text-xs text-amber-300 mt-2">Project reference unavailable after refresh. Your topic is preserved.</p>}
            {learning.study.edges.filter(e => e.toId === n.id && e.status === "accepted").map(e => <div key={e.id} className="text-xs text-zinc-400 mt-2">{learning.study.nodes.find(o => o.id === e.fromId)?.title} → {n.title} <button className="text-amber-300 underline ml-2" disabled={busy} onClick={() => mutate("study_edge", { fromId: e.fromId, toId: e.toId, status: "rejected" })}>Remove prerequisite</button></div>)}
          </li>)}</ol>
        </section>)}
        <form className="grid sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); mutate("study_edge", { fromId: data.get("from"), toId: data.get("to"), status: "accepted" }); }}><select name="from" className={field} aria-label="Prerequisite topic">{learning.study.nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select><span className="text-cyan-300" aria-hidden="true">→</span><select name="to" className={field} aria-label="Dependent topic">{learning.study.nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select><button className={button} disabled={busy}>Add prerequisite</button></form>
        <h4 className="text-sm text-zinc-200">Review catalog suggestions</h4>
        {learning.study.edges.filter(e => e.origin === "catalog" && e.status !== "accepted").map(e => <div key={e.id} className="rounded-lg border border-zinc-800 p-3 text-sm text-zinc-300"><p>{learning.study.nodes.find(n => n.id === e.fromId)?.title} → {learning.study.nodes.find(n => n.id === e.toId)?.title} · {e.status}</p><p className="text-xs text-zinc-400 mt-2">{e.rationale} Catalog {e.catalogVersion}.</p><div className="flex gap-2 mt-2"><button className={button} disabled={busy} onClick={() => mutate("study_edge", { fromId: e.fromId, toId: e.toId, status: "accepted" })}>Accept</button><button className={button} disabled={busy || e.status === "rejected"} onClick={() => mutate("study_edge", { fromId: e.fromId, toId: e.toId, status: "rejected" })}>Reject</button></div></div>)}
      </> : <p className="text-sm text-zinc-400">Add topics or update suggestions to build a study path. No prerequisites have been invented for unrecognized modules.</p>}
    </div>}
  </section>;
}
