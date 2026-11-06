import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import type { CodeAnalysis, FeatureTrace } from "@/lib/services/code-analyzer.service";
import type { WalkEdge, WalkFile, WalkPath, WalkthroughSnapshot } from "./shared";
import { analyzeStaticCalls } from "./static-calls";

export const ANALYZER_VERSION = "walkthrough-2";
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const targetKey = (file: string) => `file-${digest(file).slice(0, 24)}`;
const edgeSchema = z.object({ id: z.string(), from: z.string(), to: z.string(), kind: z.enum(["imports", "static_call"]), basis: z.enum(["syntax", "heuristic"]).optional(), line: z.number().int().positive().optional(), fromSymbol: z.string().optional(), toSymbol: z.string().optional(), toLine: z.number().int().positive().optional() });
const stepSchema = z.object({ id: z.string(), targetId: z.string(), file: z.string(), layer: z.string(), symbol: z.string().optional(), line: z.number().int().positive().optional(), symbolKind: z.enum(["file_export", "entry", "called"]), concepts: z.array(z.string()), risks: z.array(z.string()), evidence: edgeSchema.optional(), alternatives: z.array(edgeSchema) });
const pathSchema = z.object({ id: z.string(), key: z.string(), title: z.string(), entry: z.string(), terminal: z.string(), kind: z.enum(["imports", "static_call"]), hops: z.array(stepSchema).min(1).max(24), contentVersion: z.string(), stopReason: z.enum(["no_forward_import", "no_resolved_call", "step_limit", "cycle", "legacy_unknown"]) });
const snapshotSchema = z.object({ schemaVersion: z.literal(2), analyzerVersion: z.string(), analysisId: z.string(), analyzedAt: z.number().nullable(), sourceFingerprint: z.string().nullable(), legacy: z.boolean(), warning: z.string().optional(), coverage: z.object({ scanned: z.number().nullable(), astFiles: z.number().nullable(), truncated: z.boolean().nullable(), entryCount: z.number().nullable(), pathCount: z.number(), recommendedLimit: z.number(), stepLimit: z.number() }), files: z.array(z.object({ id: z.string(), file: z.string(), layer: z.string(), hash: z.string().nullable() })), edges: z.array(edgeSchema), paths: z.array(pathSchema) });
const legacySchema = z.array(z.object({ id: z.string(), title: z.string(), entry: z.string(), terminal: z.string(), hops: z.array(z.object({ file: z.string(), layer: z.string(), symbol: z.string().optional(), line: z.number().int().positive().optional(), concepts: z.array(z.string()), risks: z.array(z.string()) })).max(24) }));

export function normalizeSnapshot(raw: string | null | undefined, mapId: string, fingerprint: string | null = null): WalkthroughSnapshot {
  const empty: WalkthroughSnapshot = { schemaVersion: 2, analyzerVersion: "legacy", analysisId: `legacy-${mapId}`, analyzedAt: null, sourceFingerprint: fingerprint, legacy: true, coverage: { scanned: null, astFiles: null, truncated: null, entryCount: null, pathCount: 0, recommendedLimit: 8, stepLimit: 6 }, files: [], edges: [], paths: [] };
  if (!raw) return empty;
  try {
    const value: unknown = JSON.parse(raw);
    const parsed = snapshotSchema.safeParse(value);
    if (parsed.success) return parsed.data;
    const old = legacySchema.safeParse(value);
    if (!old.success) return { ...empty, warning: "Saved walkthrough data could not be read. Re-analyze to regenerate it." };
    const files = new Map<string, WalkFile>();
    const paths: WalkPath[] = old.data.map(t => {
      const key = `imports:${t.entry}`;
      const hops = t.hops.map(h => {
        files.set(h.file, { id: targetKey(h.file), file: h.file, layer: h.layer, hash: null });
        return { ...h, id: targetKey(h.file), targetId: targetKey(h.file), symbolKind: "file_export" as const, alternatives: [] };
      });
      return { ...t, id: `path-${digest(key).slice(0, 24)}`, key, hops, kind: "imports", stopReason: "legacy_unknown", contentVersion: `legacy-${mapId}` };
    });
    return { ...empty, files: [...files.values()], paths, coverage: { ...empty.coverage, pathCount: paths.length } };
  } catch { return { ...empty, warning: "Saved walkthrough data could not be read. Re-analyze to regenerate it." }; }
}

export function buildSnapshot(code: CodeAnalysis, traces: FeatureTrace[], fingerprint: string | null, aliases: Record<string, string[]> = {}): WalkthroughSnapshot {
  const files: WalkFile[] = code.corpus.map(f => ({ id: targetKey(f.rel), file: f.rel, layer: f.layer, hash: digest(f.content) }));
  const byFile = new Map(files.map(f => [f.file, f]));
  const entryFiles = new Set(code.corpus.filter(f => ["Routes & Pages", "API Endpoints"].includes(f.layer)).map(f => f.rel));
  const calls = analyzeStaticCalls(code.corpus, aliases, [...entryFiles]);
  const parsedFiles = new Set(calls.parsedFiles);
  const syntaxPairs = new Set(calls.imports.map(e => `${e.from}\0${e.to}`));
  const uniqueImports = new Map(code.importEdges.slice(0, 5000).map(([from, to]) => [`${from}\0${to}`, [from, to] as const]));
  // For syntax-parsed JS/TS, discard regex-only matches (comments, strings and type guesses).
  const edges: WalkEdge[] = [...uniqueImports.values()].filter(([from, to]) => !parsedFiles.has(from) || syntaxPairs.has(`${from}\0${to}`)).map(([from, to]) => ({ id: digest(`import:${from}:${to}`).slice(0, 24), from, to, kind: "imports", basis: "heuristic" }));
  for (const edge of calls.imports) {
    const existing = edges.find(e => e.from === edge.from && e.to === edge.to);
    if (existing) Object.assign(existing, edge); else edges.push(edge);
  }
  for (const e of edges) {
    e.line ??= code.importLocations?.find(loc => loc.from === e.from && loc.to === e.to)?.line;
  }
  const paths: WalkPath[] = traces.filter(t => t.hops.every((h, i) => !i || edges.some(e => e.from === t.hops[i - 1].file && e.to === h.file))).map(t => {
    const key = `imports:${t.entry}`;
    const hops = t.hops.map((h, i) => ({ ...h, id: targetKey(h.file), targetId: targetKey(h.file), symbolKind: "file_export" as const,
      evidence: i ? edges.find(e => e.from === t.hops[i - 1].file && e.to === h.file) : undefined,
      alternatives: edges.filter(e => e.from === h.file),
    }));
    const lastEdges = edges.filter(e => e.from === t.terminal);
    const stopReason = hops.length >= 6 ? "step_limit" : lastEdges.some(e => hops.some(h => h.file === e.to)) ? "cycle" : "no_forward_import";
    return { ...t, id: `path-${digest(key).slice(0, 24)}`, key, hops, kind: "imports", stopReason,
      contentVersion: digest(JSON.stringify(hops.map(h => [h.file, byFile.get(h.file)?.hash, h.evidence, h.alternatives]))) };
  });
  edges.push(...calls.edges);
  const roots = new Map<string, WalkEdge>();
  for (const e of calls.edges) if (entryFiles.has(e.from) && calls.entries.some(n => n.file === e.from && n.symbol === e.fromSymbol)) roots.set(`${e.from}::${e.fromSymbol}`, e);
  for (const [root, first] of [...roots].sort(([a], [b]) => a.localeCompare(b)).slice(0, 128)) {
    const key = `static_call:${root}`;
    const seed = traces.find(t => t.entry === first.from);
    const hops: WalkPath["hops"] = [];
    const seen = new Set<string>();
    let file = first.from; let symbol = first.fromSymbol!; let incoming: WalkEdge | undefined;
    let stopReason: WalkPath["stopReason"] = "no_resolved_call";
    for (let i = 0; i < 24; i++) {
      const target = byFile.get(file); if (!target) break;
      const identity = `${file}::${symbol}`;
      if (seen.has(identity)) { stopReason = "cycle"; break; }
      seen.add(identity);
      const outgoing = calls.edges.filter(e => e.from === file && e.fromSymbol === symbol).sort((a, b) => (a.line ?? 0) - (b.line ?? 0) || a.id.localeCompare(b.id));
      const original = seed?.hops.find(h => h.file === file);
      hops.push({ id: `step-${digest(identity).slice(0, 24)}`, targetId: target.id, file, layer: target.layer, symbol, symbolKind: i ? "called" : "entry", line: incoming?.toLine ?? calls.entries.find(e => e.file === file && e.symbol === symbol)?.line, concepts: original?.concepts ?? code.findings.filter(f => f.file === file).map(f => f.name), risks: original?.risks ?? [], evidence: incoming, alternatives: outgoing });
      if (!outgoing.length) break;
      if (i === 23) { stopReason = "step_limit"; break; }
      incoming = outgoing[0]; file = incoming.to; symbol = incoming.toSymbol!;
    }
    if (hops.length > 1) paths.push({ id: `path-${digest(key).slice(0, 24)}`, key, title: `${seed?.title ?? first.from} · ${first.fromSymbol}`, entry: first.from, terminal: hops[hops.length - 1].file, kind: "static_call", hops, stopReason, contentVersion: digest(JSON.stringify(hops.map(h => [h.file, h.symbol, byFile.get(h.file)?.hash, h.evidence, h.alternatives]))) });
  }
  return { schemaVersion: 2, analyzerVersion: ANALYZER_VERSION, analysisId: randomUUID(), analyzedAt: Date.now(), sourceFingerprint: fingerprint, legacy: false,
    warning: [calls.unresolved ? `${calls.unresolved} call sites were outside supported static resolution; calls are possibilities, not observed execution.` : "", calls.limited || code.importEdges.length > 5000 ? "Relationship processing reached a 5,000-edge budget; coverage is partial." : "", roots.size > 128 ? `Showing 128 of ${roots.size} recognized static entry functions.` : ""].filter(Boolean).join(" ") || undefined,
    coverage: { scanned: code.fileCount, astFiles: calls.parsed, truncated: code.truncated, entryCount: entryFiles.size, pathCount: paths.length, recommendedLimit: 8, stepLimit: 24 }, files, edges, paths };
}
