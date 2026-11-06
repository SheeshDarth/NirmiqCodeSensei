import type { KnowledgeGraphData } from "@/lib/services/knowledge-graph.service";

export type WalkFile = { id: string; file: string; layer: string; hash: string | null };
export type WalkEdge = {
  id: string; from: string; to: string; kind: "imports" | "static_call";
  line?: number; fromSymbol?: string; toSymbol?: string; toLine?: number;
  basis?: "syntax" | "heuristic";
};
export type WalkStep = {
  id: string; targetId: string; file: string; layer: string; symbol?: string; line?: number;
  symbolKind: "file_export" | "entry" | "called";
  concepts: string[]; risks: string[]; evidence?: WalkEdge; alternatives: WalkEdge[];
};
export type WalkPath = {
  id: string; key: string; title: string; entry: string; terminal: string;
  kind: "imports" | "static_call"; hops: WalkStep[]; contentVersion: string;
  stopReason: "no_forward_import" | "no_resolved_call" | "step_limit" | "cycle" | "legacy_unknown";
};
export type WalkthroughSnapshot = {
  schemaVersion: 2; analyzerVersion: string; analysisId: string; analyzedAt: number | null;
  sourceFingerprint: string | null; legacy: boolean; warning?: string;
  coverage: { scanned: number | null; astFiles: number | null; truncated: boolean | null;
    entryCount: number | null; pathCount: number; recommendedLimit: number; stepLimit: number };
  files: WalkFile[]; edges: WalkEdge[]; paths: WalkPath[];
};
export type SourceExcerpt = {
  file: string; content: string; startLine: number; endLine: number; totalLines: number;
  hash: string; freshness: "matches" | "changed" | "unknown"; anchorLine: number | null;
};
export type Freshness = "metadata_matches" | "changed" | "unavailable" | "unknown";

export const RUBRIC_VERSION = "1";
export const RUBRIC = [
  "Explain the entry file's purpose and identify what starts it, or why the trigger is unknown.",
  "Explain the connections using import or call-site evidence. Distinguish a dependency from a possible call.",
  "Describe data crossing one boundary with a source reference, or explain what evidence is missing.",
  "Explain a branch or failure consequence from source, or identify why it cannot be established.",
  "Explain the walkthrough's stopping reason, coverage limits, and one remaining uncertainty.",
] as const;
export const STOP_LABELS: Record<WalkPath["stopReason"], string> = {
  no_forward_import: "No further import in the suggested layer order was found. Other dependencies may exist.",
  no_resolved_call: "No further supported static call was resolved. This does not prove execution ends here.",
  step_limit: "The walkthrough reached its step limit. More code may follow.",
  cycle: "The next connection revisits a step. The walkthrough stops at this cycle boundary.",
  legacy_unknown: "This older analysis did not record why the walkthrough stopped.",
};

/** Add selected files omitted by the overview cap, using only recorded evidence. */
export function projectPathGraph(graph: KnowledgeGraphData, path?: WalkPath): KnowledgeGraphData {
  if (!path) return graph;
  const nodes = graph.nodes.map(n => ({ ...n }));
  const links = graph.links.map(l => ({ ...l }));
  const ids = new Set(nodes.map(n => n.id));
  for (const hop of path.hops) {
    const id = `file:${hop.file}`;
    if (!ids.has(id)) { ids.add(id); nodes.push({ id, label: hop.file, type: "file", val: 5, summary: hop.layer }); }
    if (hop.evidence && !links.some(l => l.source === `file:${hop.evidence!.from}` && l.target === `file:${hop.evidence!.to}` && l.kind === hop.evidence!.kind)) {
      links.push({ source: `file:${hop.evidence.from}`, target: `file:${hop.evidence.to}`, kind: hop.evidence.kind === "static_call" ? "static_call" : "imports" });
    }
  }
  return { ...graph, nodes, links };
}

export function assessRubric(scores: number[]): { score: number; ready: boolean } {
  const valid = scores.length === 5 && scores.every(s => Number.isInteger(s) && s >= 0 && s <= 2);
  const score = valid ? scores.reduce((a, b) => a + b, 0) : 0;
  return { score, ready: valid && score >= 8 && scores[1] === 2 && scores[4] === 2 };
}

/** Traverse one supported static branch at a time; source order is a display tie-break only. */
export function selectCallBranches(snapshot: WalkthroughSnapshot, base: WalkPath, choices: Record<string, string>): WalkPath {
  if (base.kind !== "static_call") return base;
  const hops: WalkStep[] = [];
  const seen = new Set<string>();
  let current = base.hops[0];
  let stopReason: WalkPath["stopReason"] = "no_resolved_call";
  while (current && hops.length < 24) {
    if (seen.has(current.id)) { stopReason = "cycle"; break; }
    seen.add(current.id);
    const alternatives = snapshot.edges.filter(e => e.kind === "static_call" && e.from === current.file && e.fromSymbol === current.symbol).sort((a, b) => (a.line ?? 0) - (b.line ?? 0) || a.id.localeCompare(b.id));
    hops.push({ ...current, alternatives });
    const next = alternatives.find(e => e.id === choices[current.id]) ?? alternatives[0];
    if (!next) break;
    if (hops.length === 24) { stopReason = "step_limit"; break; }
    const file = snapshot.files.find(f => f.file === next.to);
    if (!file) break;
    const existing = base.hops.find(h => h.file === next.to && h.symbol === next.toSymbol);
    current = { id: `${file.id}::${next.toSymbol}`, targetId: file.id, file: file.file, layer: file.layer, symbol: next.toSymbol, symbolKind: "called", line: next.toLine, concepts: existing?.concepts ?? [], risks: existing?.risks ?? [], alternatives: [], evidence: next };
    // A uniform symbol identity also detects a return to the first step.
    current.id = base.hops.find(h => h.file === current.file && h.symbol === current.symbol)?.id ?? current.id;
  }
  return { ...base, hops, stopReason, terminal: hops.at(-1)?.file ?? base.entry,
    contentVersion: JSON.stringify(hops.map(h => [h.file, h.symbol, snapshot.files.find(f => f.id === h.targetId)?.hash, h.evidence?.id, h.alternatives.map(e => e.id)])) };
}

export function studyLevels(nodes: Array<{ id: string; position: number }>, edges: Array<{ fromId: string; toId: string; status: string }>): Map<string, number> | null {
  const indegree = new Map(nodes.map(n => [n.id, 0]));
  const levels = new Map(nodes.map(n => [n.id, 0]));
  const accepted = edges.filter(e => e.status === "accepted");
  for (const e of accepted) { if (!indegree.has(e.fromId) || !indegree.has(e.toId)) return null; indegree.set(e.toId, indegree.get(e.toId)! + 1); }
  const queue = nodes.filter(n => indegree.get(n.id) === 0).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)).map(n => n.id);
  let visited = 0;
  while (queue.length) {
    const from = queue.shift()!; visited++;
    for (const e of accepted.filter(e => e.fromId === from)) {
      levels.set(e.toId, Math.max(levels.get(e.toId)!, levels.get(from)! + 1));
      indegree.set(e.toId, indegree.get(e.toId)! - 1);
      if (indegree.get(e.toId) === 0) queue.push(e.toId);
    }
  }
  return visited === nodes.length ? levels : null;
}
