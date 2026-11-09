import type { pathwayAttempts } from "@/lib/db/schema";
type Attempt = typeof pathwayAttempts.$inferSelect;
function context(value: string): { title: string; files: string[] } {
  try { const saved = JSON.parse(value); return { title: typeof saved.path?.title === "string" ? saved.path.title : "Saved walkthrough", files: Array.isArray(saved.path?.hops) ? saved.path.hops.filter((h: { file?: unknown }) => typeof h.file === "string").map((h: { file: string }) => h.file) : [] }; }
  catch { return { title: "Saved walkthrough", files: [] }; }
}
export default function PathwayAttemptHistory({ attempts, currentVersion, sourceMatches = false }: { attempts: Attempt[]; currentVersion?: string; sourceMatches?: boolean }) {
  return <section aria-label="Saved pathway explanations" className="space-y-3">
    <p className="text-xs text-zinc-400">Each retry is a separate attempt. The original walkthrough and rubric remain attached after refresh.</p>
    {attempts.map(a => {
      const saved = context(a.snapshotJson);
      let criteria: string[] = []; let scores: number[] = [];
      try { const rubric = JSON.parse(a.rubricJson); criteria = rubric.criteria.filter((c: unknown) => typeof c === "string"); scores = JSON.parse(a.scoresJson); } catch { /* legacy or damaged history stays readable */ }
      return <details key={a.id} className="rounded-lg border border-zinc-800 p-3">
        <summary className="text-xs text-zinc-300 cursor-pointer">{saved.title} · {new Date(a.createdAt).toLocaleString("en-US")} · {a.score}/10 · {a.ready ? "Self-assessed ready for saved version" : "Needs review"}</summary>
        <p className="text-xs text-amber-200 mt-3">{currentVersion === a.contentVersion && sourceMatches ? "Source version matches the current selection." : "Check the current walkthrough before applying this assessment to changed source."}</p>
        <pre className="whitespace-pre-wrap break-words text-sm text-zinc-300 mt-3">{a.answer}</pre>
        <ol className="list-decimal pl-5 text-xs text-zinc-400 mt-3 space-y-2">{criteria.map((c, i) => <li key={i}>{c} — {scores[i] ?? "unavailable"}/2</li>)}</ol>
        <details className="mt-3"><summary className="text-xs text-cyan-300 cursor-pointer">Original source references</summary><ol className="list-decimal pl-5 text-xs text-zinc-400 mt-2 space-y-1">{saved.files.map((f, i) => <li key={`${i}:${f}`} className="font-mono break-all">{f}</li>)}</ol></details>
        <p className="text-xs text-zinc-500 mt-3">Revisit evidence for partial or missing criteria, then submit a revised explanation.</p>
      </details>;
    })}
    {!attempts.length && <p className="text-xs text-zinc-500">No pathway explanations saved yet.</p>}
  </section>;
}
