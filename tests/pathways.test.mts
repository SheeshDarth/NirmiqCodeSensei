import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, appendFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
const temp = mkdtempSync(path.join(os.tmpdir(), "ncs-pathways-"));
process.env.NCS_DATA_DIR = path.join(temp, "database");
const { db, sqliteConnection } = await import("@/lib/db/client");
const { runMigrations } = await import("@/lib/db/migrate");
runMigrations();
const schema = await import("@/lib/db/schema");
const { eq } = await import("drizzle-orm");
const { analyzeCode, buildFeatureTraces } = await import("@/lib/services/code-analyzer.service");
const { buildSnapshot, normalizeSnapshot, ANALYZER_VERSION } = await import("@/lib/pathways/snapshot");
const { analyzeStaticCalls } = await import("@/lib/pathways/static-calls");
const { selectCallBranches, projectPathGraph, assessRubric, studyLevels } = await import("@/lib/pathways/shared");
const { readConfinedSource, getSourceExcerpt } = await import("@/lib/services/source-view.service");
const { sameOriginRequest } = await import("@/lib/utils/request-origin");
const { getPathwaySnapshot } = await import("@/lib/services/pathway.service");
const { getPathwayLearning, reviewPathwayStep, submitPathwayAttempt } = await import("@/lib/services/pathway-learning.service");
const { saveStudyNode, getStudyPath, saveStudyEdge, syncStudySuggestions } = await import("@/lib/services/study-path.service");
const { analyzeProject, reanalyzeProject } = await import("@/lib/services/project-analyzer.service");
const { generateFlowMarkdown } = await import("@/lib/services/export.service");
const root = path.join(temp, "project");
mkdirSync(path.join(root, "app", "api", "demo"), { recursive: true });
mkdirSync(path.join(root, "lib", "services"), { recursive: true });
writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "pathway-fixture", dependencies: { next: "16" } }));
writeFileSync(path.join(root, "app", "api", "demo", "route.ts"), 'import { save, audit } from "../../../lib/services/demo";\nexport function GET() { save(); audit(); }\n');
writeFileSync(path.join(root, "lib", "services", "demo.ts"), 'export function save() { return "saved"; }\nexport const audit = () => "audit";\n');
const code = analyzeCode(root, "Fixture");
const snapshot = buildSnapshot(code, buildFeatureTraces(code), "metadata");
after(() => { sqliteConnection.close(); assert.ok(path.resolve(temp).startsWith(path.join(os.tmpdir(), "ncs-pathways-"))); rmSync(temp, { recursive: true, force: true }); });

test("snapshot normalizes legacy safely and new snapshots retain evidence/versions", () => {
  const old = normalizeSnapshot(JSON.stringify([{ id: "old", title: "Route", entry: "app/page.tsx", terminal: "lib/service.ts", hops: [{ file: "app/page.tsx", layer: "Routes & Pages", symbol: "Page", concepts: [], risks: [] }, { file: "lib/service.ts", layer: "Services", concepts: [], risks: [] }] }]), "map");
  assert.equal(old.legacy, true); assert.equal(old.paths[0].stopReason, "legacy_unknown");
  assert.equal(old.paths[0].hops[0].symbolKind, "file_export"); assert.equal(old.files[0].hash, null);
  assert.equal(normalizeSnapshot("{broken", "map").paths.length, 0);
  assert.match(normalizeSnapshot("{broken", "map").warning!, /could not be read/);
  assert.deepEqual(normalizeSnapshot(JSON.stringify(snapshot), "map"), JSON.parse(JSON.stringify(snapshot)));
  assert.equal(snapshot.analyzerVersion, ANALYZER_VERSION);
  assert.ok(snapshot.files.every(f => f.hash?.length === 64));
});

test("static calls resolve actual imported targets and branches without claiming unused exports", () => {
  const calls = analyzeStaticCalls(code.corpus);
  assert.ok(calls.edges.some(e => e.fromSymbol === "GET" && e.toSymbol === "save" && e.line === 2));
  assert.ok(calls.edges.some(e => e.toSymbol === "audit"));
  const base = snapshot.paths.find(p => p.kind === "static_call")!;
  assert.ok(base, "a supported entry has a static walkthrough");
  const first = selectCallBranches(snapshot, base, {});
  const alternative = first.hops[0].alternatives.find(e => e.toSymbol === "audit")!;
  const branched = selectCallBranches(snapshot, base, { [first.hops[0].id]: alternative.id });
  assert.equal(branched.hops[1].symbol, "audit");
  assert.notEqual(branched.contentVersion, first.contentVersion);
  assert.equal(branched.stopReason, "no_resolved_call");
});

test("static aliases, re-exports, shadowing, namespace calls and dynamic receivers", () => {
  const records = [
    ["app/page.ts", 'import { actual as aliased } from "@/barrel"; import * as ns from "@/service"; export function Page() { aliased(); ns.actual(); const aliased = () => 1; aliased(); const x:any = {}; x.dynamic(); }'],
    ["barrel.ts", 'export { actual } from "./service";'],
    ["service.ts", 'export function unused() {} export function actual() {}'],
  ].map(([rel, content]) => ({ rel, content, layer: "", bytes: content.length, loc: 1, isTsJs: true, isClientComponent: false }));
  const result = analyzeStaticCalls(records, { "@/*": ["*"] });
  assert.ok(result.edges.some(e => e.to === "service.ts" && e.toSymbol === "actual"));
  assert.ok(!result.edges.some(e => e.toSymbol === "unused"));
  assert.ok(result.unresolved >= 1);
  assert.ok(result.edges.some(e => e.to === "app/page.ts" && e.toSymbol === "Page.aliased"));
  assert.ok(result.imports.some(e => e.from === "barrel.ts" && e.to === "service.ts"));
});

test("graph projection retains pruned path files and rubric threshold requires core criteria", () => {
  const p = snapshot.paths[0];
  assert.ok(p);
  const graph = projectPathGraph({ nodes: [], links: [] }, p);
  assert.ok(p.hops.every(h => graph.nodes.some(n => n.id === `file:${h.file}`)));
  assert.deepEqual(assessRubric([2, 2, 1, 1, 2]), { score: 8, ready: true });
  assert.equal(assessRubric([2, 1, 2, 2, 2]).ready, false);
  assert.equal(assessRubric([2, 2, 2, 2, 1]).ready, false);
  assert.equal(assessRubric([3, 2, 2, 2, 2]).ready, false);
});

test("ambiguous same-named lexical targets remain unresolved instead of sharing progress identity", () => {
  const content = 'export function Page(){ if(true){const helper=()=>1;helper();} else {const helper=()=>2;helper();} }';
  const result = analyzeStaticCalls([{ rel: "app/page.ts", content, layer: "Routes & Pages", bytes: content.length, loc: 1, isTsJs: true, isClientComponent: false }]);
  assert.equal(result.edges.length, 0); assert.equal(result.unresolved, 2);
});

test("source preview confines paths, checks content hashes, rejects binary and oversized source", () => {
  const file = snapshot.files.find(f => f.file.endsWith("demo.ts"))!;
  const result = readConfinedSource(root, file.file, file.hash, 1);
  assert.equal(result.ok, true); if (result.ok) assert.equal(result.data.freshness, "matches");
  for (const name of ["../outside.ts", "/outside.ts", "C:/outside.ts", ".env.ts", "lib/../outside.ts", "lib\\demo.ts", "credentials/a.ts"]) assert.equal(readConfinedSource(root, name, null).ok, false, name);
  writeFileSync(path.join(root, "large.ts"), "x".repeat(80_001));
  writeFileSync(path.join(root, "binary.ts"), Buffer.from([0, 1, 2]));
  assert.equal(readConfinedSource(root, "large.ts", null).ok, false);
  assert.equal(readConfinedSource(root, "binary.ts", null).ok, false);
  const changed = readConfinedSource(root, file.file, "wrong", 1);
  assert.ok(changed.ok); if (changed.ok) { assert.equal(changed.data.freshness, "changed"); assert.equal(changed.data.anchorLine, null); }
  const many = "const line = 1;\n".repeat(250); writeFileSync(path.join(root, "many.ts"), many);
  const excerpt = readConfinedSource(root, "many.ts", null, 80);
  assert.ok(excerpt.ok); if (excerpt.ok) assert.ok(excerpt.data.content.split("\n").length <= 120);
});

test("source preview rejects directory junctions and cross-site request context", () => {
  const outside = path.join(temp, "outside"); mkdirSync(outside); writeFileSync(path.join(outside, "private.ts"), "private");
  symlinkSync(outside, path.join(root, "linked"), process.platform === "win32" ? "junction" : "dir");
  assert.equal(readConfinedSource(root, "linked/private.ts", null).ok, false);
  assert.equal(sameOriginRequest(new Request("http://127.0.0.1:3000/source", { headers: { origin: "https://example.com", "sec-fetch-site": "cross-site" } })), false);
  assert.equal(sameOriginRequest(new Request("http://127.0.0.1:3000/source", { headers: { origin: "http://127.0.0.1:3000", "sec-fetch-site": "same-origin" } })), true);
  assert.equal(sameOriginRequest(new Request("http://localhost:3000/source", { headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } })), true);
  assert.equal(sameOriginRequest(new Request("http://localhost:3000/source", { headers: { host: "example.com", origin: "http://example.com" } })), false);
});

let workspaceId = "";
test("pipeline stores snapshots; source IDs and durable assessments remain workspace scoped", async () => {
  const result = await analyzeProject({ projectPath: root }); assert.ok(result.ok);
  workspaceId = result.data.workspaceId;
  const saved = await getPathwaySnapshot(workspaceId); assert.ok(saved.ok);
  const walk = saved.data.paths.find(p => p.kind === "static_call") ?? saved.data.paths[0]; assert.ok(walk);
  const input = { analysisId: saved.data.analysisId, pathId: walk.id, choices: {} };
  const selected = selectCallBranches(saved.data, walk, {});
  assert.equal((await getSourceExcerpt(workspaceId, { analysisId: "old", targetId: walk.hops[0].targetId })).ok, false);
  assert.equal((await getSourceExcerpt(workspaceId, { analysisId: saved.data.analysisId, targetId: "invented" })).ok, false);
  assert.ok((await reviewPathwayStep(workspaceId, { ...input, stepId: selected.hops[0].id })).ok);
  const attempt = await submitPathwayAttempt(workspaceId, { ...input, answer: "The entry imports a service. Static calls can reach save; runtime conditions are not observed. I can inspect the call site and source boundary.", scores: [2, 2, 1, 1, 2] });
  assert.ok(attempt.ok); assert.equal(attempt.data.ready, true);
  await submitPathwayAttempt(workspaceId, { ...input, answer: "Revision with a failure limitation.", scores: [2, 2, 2, 2, 2] });
  const history = await getPathwayLearning(workspaceId); assert.ok(history.ok); assert.equal(history.data.attempts.length, 2);
  const exported = await generateFlowMarkdown(workspaceId); assert.ok(exported.ok); assert.match(exported.data.markdown, /not observed runtime execution/);
  appendFileSync(path.join(root, "lib", "services", "demo.ts"), "\nexport const changed = 1;\n");
  const changed = await submitPathwayAttempt(workspaceId, { ...input, answer: "Saved against changed source; needs review.", scores: [2, 2, 2, 2, 2] });
  assert.ok(changed.ok); assert.equal(changed.data.ready, false);
  assert.ok((await reanalyzeProject(workspaceId)).ok);
  const retained = await getPathwayLearning(workspaceId); assert.ok(retained.ok); assert.equal(retained.data.attempts.length, 3); assert.equal(retained.data.reviews.length, 1);
  assert.equal((await submitPathwayAttempt(workspaceId, { ...input, answer: "Old snapshot", scores: [2, 2, 2, 2, 2] })).ok, false);
});

test("failed refresh rolls back the generated swap and preserves active analysis", async () => {
  const before = await getPathwaySnapshot(workspaceId); assert.ok(before.ok);
  appendFileSync(path.join(root, "lib", "services", "demo.ts"), "\nexport const nextChange = 2;\n");
  sqliteConnection.exec("CREATE TRIGGER test_fail_map BEFORE INSERT ON learning_maps BEGIN SELECT RAISE(ABORT, 'fixture failure'); END;");
  try { const failed = await reanalyzeProject(workspaceId); assert.equal(failed.ok, false); }
  finally { sqliteConnection.exec("DROP TRIGGER test_fail_map;"); }
  const current = await getPathwaySnapshot(workspaceId); assert.ok(current.ok); assert.equal(current.data.analysisId, before.data.analysisId);
  const history = await getPathwayLearning(workspaceId); assert.ok(history.ok); assert.equal(history.data.attempts.length, 3);
});

test("static analysis obeys its parse cap and reports unresolved continuation", () => {
  const records = Array.from({ length: 105 }, (_, i) => {
    const rel = i === 0 ? "app/page.ts" : `lib/f${i}.ts`;
    const name = i === 0 ? "Page" : `f${i}`;
    const next = i === 0 ? "../lib/f1" : `./f${i + 1}`;
    const content = `import { f${i + 1} } from '${next}'; export function ${name}(){ return f${i + 1}(); }`;
    return { rel, content, layer: i === 0 ? "Routes & Pages" : "Services / Logic", bytes: content.length, loc: 1, isTsJs: true, isClientComponent: false };
  });
  const result = analyzeStaticCalls(records, {}, ["app/page.ts"]);
  assert.equal(result.parsed, 100);
  assert.ok(result.unresolved > 0);
  const snap = buildSnapshot({ corpus: records, importEdges: [], findings: [], chunks: [], fileCount: 105, truncated: false, graph: { nodes: [], links: [] } }, [], null);
  const walk = snap.paths.find(p => p.kind === "static_call")!;
  assert.equal(walk.hops.length, 24); assert.equal(walk.stopReason, "step_limit");
});

test("static call cycles stop without treating the last file as a feature outcome", () => {
  const definitions = [["app/page.ts", 'import { a } from "../lib/a"; export function Page(){ a(); }', "Routes & Pages"], ["lib/a.ts", 'export function a(){ b(); } function b(){ a(); }', "Services / Logic"]];
  const corpus = definitions.map(([rel, content, layer]) => ({ rel, content, layer, bytes: content.length, loc: 1, isTsJs: true, isClientComponent: false }));
  const snap = buildSnapshot({ corpus, importEdges: [], findings: [], chunks: [], fileCount: 2, truncated: false, graph: { nodes: [], links: [] } }, [], null);
  const walk = selectCallBranches(snap, snap.paths[0], {});
  assert.equal(walk.stopReason, "cycle"); assert.equal(walk.hops.length, 3);
});

test("study prerequisites reject cycles and foreign nodes; edits and rejected suggestions survive refresh", async () => {
  assert.ok((await saveStudyNode(workspaceId, { title: "First" })).ok);
  assert.ok((await saveStudyNode(workspaceId, { title: "Second" })).ok);
  const study = await getStudyPath(workspaceId); assert.ok(study.ok);
  const [a, b] = study.data.nodes;
  assert.ok((await saveStudyEdge(workspaceId, { fromId: a.id, toId: b.id, status: "accepted" })).ok);
  const cyclic = await saveStudyEdge(workspaceId, { fromId: b.id, toId: a.id, status: "accepted" }); assert.equal(cyclic.ok, false);
  assert.equal(studyLevels([{ id: "a", position: 0 }, { id: "b", position: 0 }], [{ fromId: "a", toId: "b", status: "accepted" }, { fromId: "b", toId: "a", status: "accepted" }]), null);
  assert.equal((await saveStudyEdge(workspaceId, { fromId: a.id, toId: crypto.randomUUID(), status: "accepted" })).ok, false);
  await db.insert(schema.conceptLinks).values({ workspaceId, projectFeature: "Demo", conceptName: "Recursion" });
  await syncStudySuggestions(workspaceId);
  const seeded = await getStudyPath(workspaceId); assert.ok(seeded.ok);
  const proposed = seeded.data.edges.find(e => e.origin === "catalog")!; assert.ok(proposed);
  await saveStudyEdge(workspaceId, { fromId: proposed.fromId, toId: proposed.toId, status: "rejected" });
  await saveStudyNode(workspaceId, { id: a.id, title: "Renamed first", position: 7 });
  await syncStudySuggestions(workspaceId);
  const resynced = await getStudyPath(workspaceId); assert.ok(resynced.ok);
  assert.equal(resynced.data.edges.find(e => e.id === proposed.id)?.status, "rejected");
  assert.equal(resynced.data.nodes.find(n => n.id === a.id)?.title, "Renamed first");
  assert.ok((await reanalyzeProject(workspaceId)).ok);
  const retained = await getStudyPath(workspaceId); assert.ok(retained.ok); assert.ok(retained.data.nodes.some(n => n.id === a.id));
  assert.equal(retained.data.edges.find(e => e.id === proposed.id)?.status, "rejected");
  const rows = db.select().from(schema.pathwayAttempts).where(eq(schema.pathwayAttempts.workspaceId, workspaceId)).all(); assert.equal(rows.length, 3);
  assert.ok(readFileSync(path.join(root, "lib", "services", "demo.ts"), "utf8").includes("nextChange"));
});
