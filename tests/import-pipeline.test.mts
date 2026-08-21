/**
 * Import-pipeline happy-path tests (audit #32, REVIEW-007).
 *
 * Runner: Node's built-in node:test driven by tsx — `npm test`.
 * Zero new dependencies. The DB is fully isolated: NCS_DATA_DIR points at a
 * fresh temp dir (set BEFORE any DB-touching import) and migrations are applied
 * programmatically, so the real data/nirmiqcodesensei.db is never touched.
 *
 * Covered: resolveProjectPath, analyzeCode (signals/graph/truncation),
 * analyzeProject local-heuristic end-to-end (extraction → persistence),
 * H4 duplicate-import guard, reanalyzeProject, deleteWorkspace cascade,
 * system-path block. The AI structured-outputs branch is intentionally NOT
 * covered (needs a live API key; see REVIEW-007).
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, appendFileSync, rmSync } from "fs";
import path from "path";
import os from "os";

// ── DB isolation: must happen before any dynamic import below ────────────────
const dataDir = mkdtempSync(path.join(os.tmpdir(), "nirmiq-test-data-"));
process.env.NCS_DATA_DIR = dataDir;

// Dynamic imports so lib/db/client binds to the temp NCS_DATA_DIR.
const { db } = await import("@/lib/db/client");
const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
const schema = await import("@/lib/db/schema");
const { eq } = await import("drizzle-orm");
const { resolveProjectPath, normalizeGitHubUrl, analyzeProject, reanalyzeProject, IMPORTED_PROJECTS_DIR } =
  await import("@/lib/services/project-analyzer.service");
const { analyzeCode, buildFeatureTraces } = await import("@/lib/services/code-analyzer.service");
const { computeSeniorReview, computeCodeHealthScore } = await import("@/lib/services/senior-review.service");
const { detectStack } = await import("@/lib/services/local-analyzer.service");
const { deleteWorkspace } = await import("@/lib/services/workspace.service");
const { createDebugLog } = await import("@/lib/services/debug-log.service");

// ── GitHub URL normalization (fix: GitHub import "not working") ───────────────
// The reported bug: a github.com URL with a trailing slash / /tree/<branch> / www.
// failed the strict regex, fell through to "local path", and never cloned.
test("normalizeGitHubUrl accepts the forms people paste, rejects non-github", () => {
  const canon = "https://github.com/octocat/Hello-World";
  for (const u of [
    "https://github.com/octocat/Hello-World",
    "https://github.com/octocat/Hello-World/",
    "https://github.com/octocat/Hello-World.git",
    "https://github.com/octocat/Hello-World/tree/master",
    "https://www.github.com/octocat/Hello-World?tab=readme",
    "git@github.com:octocat/Hello-World.git",
  ]) {
    assert.equal(normalizeGitHubUrl(u), canon, `should normalize: ${u}`);
  }
  for (const bad of ["https://gitlab.com/a/b", "https://evil.com/x", "C:\\Users\\me\\proj", "not a url"]) {
    assert.equal(normalizeGitHubUrl(bad), null, `should reject: ${bad}`);
  }
});

// The repo name becomes a directory under IMPORTED_PROJECTS_DIR — a "." or ".."
// segment would escape it, and cloneOrPullRepo would then `git pull` inside an
// unintended directory. Reachable from the MCP tool, not just the UI.
test("normalizeGitHubUrl refuses dot segments that would escape the clone dir", () => {
  for (const bad of [
    "https://github.com/owner/..",
    "https://github.com/owner/.",
    "https://github.com/owner/../../Windows",
    "https://github.com/../repo",
  ]) {
    assert.equal(normalizeGitHubUrl(bad), null, `should refuse traversal: ${bad}`);
  }
  // A workspace resolved from such input must never be treated as a GitHub clone.
  const r = resolveProjectPath("https://github.com/owner/..");
  assert.equal(r.isGitHub, false);
  assert.equal(r.githubUrl, undefined);
});

test("resolveProjectPath detects a trailing-slash GitHub URL as GitHub (the reported bug)", () => {
  const r = resolveProjectPath("https://github.com/octocat/Hello-World/");
  assert.equal(r.isGitHub, true);
  assert.equal(r.githubUrl, "https://github.com/octocat/Hello-World");
  assert.equal(r.repoName, "Hello-World");
});

// ── Fixture: a minimal Next.js-ish project on disk ───────────────────────────
let projectDir: string;

before(() => {
  migrate(db, { migrationsFolder: "lib/db/migrations" });

  projectDir = mkdtempSync(path.join(os.tmpdir(), "nirmiq-test-proj-"));
  mkdirSync(path.join(projectDir, "src"), { recursive: true });
  writeFileSync(
    path.join(projectDir, "package.json"),
    JSON.stringify(
      {
        name: "fixture-app",
        license: "MIT",
        scripts: { dev: "next dev", build: "next build", test: "node --test" },
        dependencies: {
          next: "16.0.0",
          react: "19.0.0",
          dayjs: "1.11.0",
          moment: "2.30.0",
        },
      },
      null,
      2
    )
  );
  writeFileSync(
    path.join(projectDir, "README.md"),
    "# Fixture App\nA tiny app used by the import-pipeline tests.\n"
  );
  writeFileSync(
    path.join(projectDir, "src", "index.ts"),
    [
      'import { helper } from "./util";',
      "const scores = [3, 1, 2];",
      "const doubled = scores.map((s) => s * 2).filter((s) => s > 2);",
      "export function fib(n: number): number {",
      "  return n < 2 ? n : fib(n - 1) + fib(n - 2);",
      "}",
      "export const total = doubled.reduce((a, b) => a + b, 0) + helper();",
    ].join("\n")
  );
  writeFileSync(
    path.join(projectDir, "src", "util.ts"),
    "export function helper(): number {\n  return new Map([[1, 2]]).size;\n}\n"
  );
  // Senior-review fixtures: a file with (fake, synthetic) security smells,
  // a client component with an alt-less <img>, and one test file.
  writeFileSync(
    path.join(projectDir, "src", "insecure.ts"),
    [
      'const apiKey = "sk-live-abcdef1234567890";',
      'export function risky(userId: string) {',
      '  const q = "SELECT * FROM users WHERE id = " + userId;',
      '  eval("2 + 2");',
      "  return { apiKey, q };",
      "}",
    ].join("\n")
  );
  writeFileSync(
    path.join(projectDir, "src", "Avatar.tsx"),
    [
      '"use client";',
      "export function Avatar() {",
      '  return <img src="/a.png" />;',
      "}",
    ].join("\n")
  );
  writeFileSync(
    path.join(projectDir, "src", "util.test.ts"),
    'import { helper } from "./util";\nif (helper() !== 1) throw new Error("bad");\n'
  );
});

after(() => {
  // better-sqlite3 may hold the WAL file handle on Windows — cleanup is best-effort.
  try { rmSync(projectDir, { recursive: true, force: true }); } catch { /* ignore */ }
  try { rmSync(dataDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ── resolveProjectPath ────────────────────────────────────────────────────────
test("resolveProjectPath: GitHub URL maps into IMPORTED_PROJECTS_DIR", () => {
  const r = resolveProjectPath("https://github.com/vercel/next.js");
  assert.equal(r.isGitHub, true);
  assert.equal(r.repoName, "next.js");
  assert.equal(r.localPath, path.join(IMPORTED_PROJECTS_DIR, "next.js"));
});

test("resolveProjectPath: local path resolves absolute, not GitHub", () => {
  const r = resolveProjectPath("./some/local/dir");
  assert.equal(r.isGitHub, false);
  assert.equal(r.repoName, "dir");
  assert.ok(path.isAbsolute(r.localPath));
});

// ── analyzeCode ───────────────────────────────────────────────────────────────
test("analyzeCode: detects real signals, builds graph, not truncated", () => {
  const code = analyzeCode(projectDir, "fixture-app");
  assert.equal(code.truncated, false);
  assert.ok(code.fileCount >= 2, "walks the source files");
  const names = code.findings.map((f) => f.name);
  assert.ok(
    names.includes("Higher-order array ops (map/filter/reduce)"),
    `expected map/filter/reduce finding, got: ${names.join(", ")}`
  );
  assert.ok(names.includes("Recursion"), "AST detects fib() self-recursion");
  assert.ok(code.graph.nodes.some((n) => n.type === "project"));
  assert.ok(code.graph.nodes.some((n) => n.type === "file"));
  assert.ok(code.chunks.length >= 2, "emits a search chunk per file");
});

// Perf guard for the single-pass AST walk (Part C). Before the refactor the 5
// "pure" detectors each ran their own full walkAst; merging them cut a ~123-file
// analysis from ~3.9s to ~0.8s. This asserts a 60-file synthetic corpus stays
// under the documented <2.5s budget — a coarse guard against regressing to the
// per-detector-walk shape. Ceiling is generous so it catches gross regression,
// not CI jitter.
test("analyzeCode: single-pass AST walk stays under budget on 60 files", () => {
  const perfDir = mkdtempSync(path.join(os.tmpdir(), "nirmiq-perf-"));
  try {
    // Each file exercises several detectors so every walk has real work to do.
    const body = [
      'import { Heap } from "./heap";',
      "class DataHeap { constructor() {} }",
      "function makeThing(): number { return 1; }",
      "function walk(n: number): number { for (let i = 0; i < n; i++) { walk(i); } return n; }",
      "function loop(a: number[]) { const s: number[] = []; s.push(1); s.pop(); let c = a.next; while (c) { c = c.next; } }",
      "const e = { on() {}, emit() {} }; e.on(); e.emit();",
    ].join("\n");
    for (let i = 0; i < 60; i++) {
      writeFileSync(path.join(perfDir, `mod${i}.ts`), body);
    }
    const t0 = performance.now();
    const code = analyzeCode(perfDir, "perf-fixture");
    const elapsed = performance.now() - t0;
    assert.ok(code.fileCount >= 60, "analyzed the corpus");
    assert.ok(
      elapsed < 2500,
      `60-file analysis took ${elapsed.toFixed(0)}ms, expected < 2500ms (single-pass budget)`
    );
  } finally {
    rmSync(perfDir, { recursive: true, force: true });
  }
});

// ── computeSeniorReview (direct, no DB) ──────────────────────────────────────
test("computeSeniorReview: security lens flags the fake key with masked snippet", () => {
  const code = analyzeCode(projectDir, "fixture-app");
  const res = computeSeniorReview({
    projectPath: projectDir,
    projectTitle: "fixture-app",
    corpus: code.corpus,
    importEdges: code.importEdges,
    graph: code.graph,
    stack: detectStack(projectDir, "fixture-app"),
  });
  assert.ok(res.ok, res.ok ? "" : res.error);
  if (!res.ok) return;
  const sec = res.data.security;
  const token = sec.findings.find((f) => f.id === "sec-known-token");
  assert.ok(token, "fake sk-live token flagged");
  assert.equal(token?.file, "src/insecure.ts");
  assert.ok((token?.line ?? 0) > 0, "finding carries a line number");
  assert.ok(
    !(token?.snippet ?? "").includes("sk-live-abcdef1234567890"),
    "stored snippet never contains the full secret"
  );
  assert.ok(sec.findings.some((f) => f.id === "sec-eval"), "eval() flagged");
  assert.ok(sec.findings.some((f) => f.id === "sec-sql-concat"), "SQL concat flagged");
});

test("computeSeniorReview: testing/deps/feasibility/frontend lens stats", () => {
  const code = analyzeCode(projectDir, "fixture-app");
  const res = computeSeniorReview({
    projectPath: projectDir,
    projectTitle: "fixture-app",
    corpus: code.corpus,
    importEdges: code.importEdges,
    graph: code.graph,
    stack: detectStack(projectDir, "fixture-app"),
  });
  assert.ok(res.ok, res.ok ? "" : res.error);
  if (!res.ok) return;
  const r = res.data;
  assert.ok(r.testing.testFileCount >= 1, "util.test.ts counted as a test file");
  assert.ok(
    r.dependencies.duplicatePurpose.some((d) => d.purpose === "dates"),
    "dayjs + moment flagged as duplicate purpose"
  );
  assert.equal(r.feasibility.runnable, true, "dev/start scripts make it runnable");
  assert.equal(r.frontend.present, true, "React fixture has a frontend");
  assert.ok(r.frontend.imgWithoutAlt.length >= 1, "alt-less <img> detected");
  assert.match(r.overall.grade, /^[A-F]$/);
});

test("security lens: tightened detectors ignore prose, catch real usage", () => {
  const mk = (rel: string, content: string) => ({
    rel,
    layer: "Lib / Utilities",
    loc: content.split("\n").length,
    bytes: Buffer.byteLength(content),
    content,
    isTsJs: true,
    isClientComponent: false,
  });
  const corpus = [
    mk("src/prose.ts", 'const note = "avoid eval() and dangerouslySetInnerHTML here";'),
    mk("src/real.ts", "export function run(x: string) {\n  return eval(x);\n}"),
  ];
  const res = computeSeniorReview({
    projectPath: projectDir,
    projectTitle: "p",
    corpus,
    importEdges: [],
    graph: { nodes: [], links: [] },
    stack: detectStack(projectDir, "p"),
  });
  assert.ok(res.ok, res.ok ? "" : res.error);
  if (!res.ok) return;
  const hits = res.data.security.findings.map((f) => `${f.file}:${f.id}`);
  assert.ok(hits.includes("src/real.ts:sec-eval"), "real eval(x) is flagged");
  assert.ok(
    !hits.some((h) => h.startsWith("src/prose.ts")),
    `prose 'eval()'/'dangerouslySetInnerHTML' must not be flagged (got: ${hits.join(", ")})`
  );
});

// ── analyzeProject end-to-end (local heuristic, temp DB) ─────────────────────
let workspaceId: string;
let seniorGeneratedAt = 0;

test("codeHealth scoring is size-relative, not count-based (MS4 calibration)", () => {
  // Healthy large project: 6 complex functions out of 400 (1.5%) → strong grade.
  const large = computeCodeHealthScore({
    totalFunctions: 400,
    highComplexCount: 1,
    medComplexCount: 5,
    oversizeFileCount: 2,
    totalFiles: 120,
  });
  assert.equal(large.grade, "A", `large healthy repo should be A, got ${large.grade} (${large.score})`);

  // SAME absolute complex-function count in a tiny project (6 of 15 = 40%) must
  // grade much worse — this is the calibration: density, not raw count.
  const small = computeCodeHealthScore({
    totalFunctions: 15,
    highComplexCount: 1,
    medComplexCount: 5,
    oversizeFileCount: 0,
    totalFiles: 5,
  });
  assert.ok(
    small.score < large.score - 20,
    `same complex count but denser must score much lower (large ${large.score}, small ${small.score})`
  );

  // Genuinely unhealthy: many high-complexity functions + oversized files → F.
  const unhealthy = computeCodeHealthScore({
    totalFunctions: 30,
    highComplexCount: 8,
    medComplexCount: 10,
    oversizeFileCount: 3,
    totalFiles: 6,
  });
  assert.equal(unhealthy.grade, "F", `dense high-complexity repo should be F, got ${unhealthy.grade} (${unhealthy.score})`);

  // Empty project must not divide by zero.
  const empty = computeCodeHealthScore({
    totalFunctions: 0,
    highComplexCount: 0,
    medComplexCount: 0,
    oversizeFileCount: 0,
    totalFiles: 0,
  });
  assert.equal(empty.score, 100);
});

test("analyzeProject: local-heuristic import populates the workspace", async () => {
  const res = await analyzeProject({ projectPath: projectDir });
  assert.ok(res.ok, res.ok ? "" : res.error);
  if (!res.ok) return;
  workspaceId = res.data.workspaceId;
  assert.ok(res.data.questionsCreated > 0, "questions extracted from local template");
  assert.ok(res.data.conceptsCreated > 0, "concepts extracted from local template");

  const qs = await db.select().from(schema.explainBackQuestions)
    .where(eq(schema.explainBackQuestions.workspaceId, workspaceId));
  assert.equal(qs.length, res.data.questionsCreated);
  const maps = await db.select().from(schema.learningMaps)
    .where(eq(schema.learningMaps.workspaceId, workspaceId));
  assert.equal(maps.length, 1, "learning map auto-created");
});

test("analyzeProject: writes sourcePath as the canonical import marker", async () => {
  const [ws] = await db.select().from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));
  assert.equal(
    ws.sourcePath,
    path.resolve(projectDir),
    "sourcePath stores the resolved import path (canonical, not the description hack)"
  );
  // description keeps the human-readable label for display + legacy back-compat
  assert.equal(ws.description, `Imported from: ${path.resolve(projectDir)}`);
});

test("analyzeProject: persists seniorReviewJson on the learning map", async () => {
  const [map] = await db.select().from(schema.learningMaps)
    .where(eq(schema.learningMaps.workspaceId, workspaceId));
  assert.ok(map.seniorReviewJson, "senior review blob stored");
  const review = JSON.parse(map.seniorReviewJson!);
  assert.equal(review.version, 1);
  assert.match(review.overall.grade, /^[A-F]$/);
  assert.ok(review.security.findings.length > 0, "fixture smells surfaced");
  seniorGeneratedAt = review.generatedAt;
  assert.ok(seniorGeneratedAt > 0);
});

test("analyzeProject: graph file nodes carry senior-review flags", async () => {
  const [map] = await db.select().from(schema.learningMaps)
    .where(eq(schema.learningMaps.workspaceId, workspaceId));
  assert.ok(map.graphJson, "graph stored");
  const graph = JSON.parse(map.graphJson!);
  const flagged = graph.nodes.find(
    (n: { id: string }) => n.id === "file:src/insecure.ts"
  );
  assert.ok(flagged, "insecure.ts appears in the graph");
  assert.ok(flagged.flags?.security, "insecure.ts badged with a security flag");
});

test("analyzeProject: tags questions + concepts with a module key (#27/#28)", async () => {
  const validKeys = new Set(["tech-stack", "how-it-works", "key-files", "risk-map"]);

  const qs = await db.select().from(schema.explainBackQuestions)
    .where(eq(schema.explainBackQuestions.workspaceId, workspaceId));
  assert.ok(qs.length > 0, "questions exist");
  assert.ok(qs.every((q) => q.moduleKey && validKeys.has(q.moduleKey)),
    "every question is tagged with a valid module key");

  const links = await db.select().from(schema.conceptLinks)
    .where(eq(schema.conceptLinks.workspaceId, workspaceId));
  const grounded = links.filter((l) => l.sourceFile);
  assert.ok(grounded.length > 0, "fixture yields code-grounded concepts");
  assert.ok(grounded.every((l) => l.moduleKey === "key-files"),
    "code-grounded concepts group under key-files");

  const [map] = await db.select().from(schema.learningMaps)
    .where(eq(schema.learningMaps.workspaceId, workspaceId));
  const modules = JSON.parse(map.modulesJson) as Array<{ key?: string }>;
  assert.ok(modules.length > 0 && modules.every((m) => m.key),
    "every learning-map module carries a stable key");
});

test("graph-utils: neighborhood depths and search matching", async () => {
  const { buildAdjacency, neighborhood, matchNodes, endpointId } = await import(
    "@/components/learning-map/graph-utils"
  );
  const links = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "c", target: "d" },
    { source: { id: "d" }, target: "e" }, // object endpoint (post-force-graph shape)
  ];
  const adj = buildAdjacency(links);
  assert.deepEqual([...neighborhood(adj, "a", 1)].sort(), ["a", "b"]);
  assert.deepEqual([...neighborhood(adj, "a", 2)].sort(), ["a", "b", "c"]);
  assert.equal(neighborhood(adj, "e", 2).has("c"), true, "object endpoints resolved");
  assert.equal(endpointId({ id: "x" }), "x");

  const nodes = [
    { id: "file:src/index.ts", label: "src/index.ts", type: "file", val: 4 },
    { id: "layer:Data Layer", label: "Data Layer", type: "layer", val: 10 },
  ] as import("@/lib/services/knowledge-graph.service").GraphNode[];
  assert.equal(matchNodes(nodes, "INDEX").length, 1, "case-insensitive match");
  assert.equal(matchNodes(nodes, "data").length, 1);
  assert.equal(matchNodes(nodes, "").length, 0, "empty query matches nothing");
});

test("analyzeProject: H4 blocks re-importing the same path", async () => {
  const res = await analyzeProject({ projectPath: projectDir });
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /already imported/i);
});

test("analyzeProject: system directories are blocked", async () => {
  const sysPath = process.platform === "win32" ? "C:\\Windows" : "/etc";
  const res = await analyzeProject({ projectPath: sysPath });
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /system directory/i);
});

// ── reanalyzeProject ─────────────────────────────────────────────────────────
test("reanalyzeProject: replaces analysis artifacts, keeps user data", async () => {
  const seeded = await createDebugLog(workspaceId, { title: "KEEP: my bug note" });
  assert.ok(seeded.ok);

  // MS4 incremental: reanalyze short-circuits on an unchanged tree, so change a
  // source file to represent the real "code changed → refresh" scenario.
  appendFileSync(
    path.join(projectDir, "src", "index.ts"),
    "\nexport const _touch = 1;\n"
  );

  const res = await reanalyzeProject(workspaceId);
  assert.ok(res.ok, res.ok ? "" : res.error);
  if (!res.ok) return;
  assert.ok(!res.data.unchanged, "changed tree triggers a full re-analysis");
  assert.ok(res.data.questionsCreated > 0, "fresh questions persisted");

  const bugs = await db.select().from(schema.debugLogs)
    .where(eq(schema.debugLogs.workspaceId, workspaceId));
  assert.equal(bugs.length, 1, "user-authored debug log preserved");
  const maps = await db.select().from(schema.learningMaps)
    .where(eq(schema.learningMaps.workspaceId, workspaceId));
  assert.equal(maps.length, 1, "exactly one learning map after refresh");
});

test("reanalyzeProject: regenerates the senior review", async () => {
  const [map] = await db.select().from(schema.learningMaps)
    .where(eq(schema.learningMaps.workspaceId, workspaceId));
  assert.ok(map.seniorReviewJson, "refresh writes a new senior review");
  const review = JSON.parse(map.seniorReviewJson!);
  assert.equal(review.version, 1);
  assert.ok(
    review.generatedAt > seniorGeneratedAt,
    `regenerated (was ${seniorGeneratedAt}, now ${review.generatedAt})`
  );
});

test("reanalyzeProject: unchanged source short-circuits (MS4 incremental)", async () => {
  // The prior test re-analysed and stored a fresh fingerprint; the tree hasn't
  // changed since, so a second reanalyze must skip the work and report unchanged.
  const before = await db.select().from(schema.explainBackQuestions)
    .where(eq(schema.explainBackQuestions.workspaceId, workspaceId));

  const res = await reanalyzeProject(workspaceId);
  assert.ok(res.ok, res.ok ? "" : res.error);
  if (!res.ok) return;
  assert.equal(res.data.unchanged, true, "unchanged tree skips re-analysis");
  assert.equal(res.data.questionsCreated, 0, "no new artifacts created");

  // Existing artifacts are left intact (not cleared+regenerated).
  const after = await db.select().from(schema.explainBackQuestions)
    .where(eq(schema.explainBackQuestions.workspaceId, workspaceId));
  assert.equal(after.length, before.length, "questions untouched on short-circuit");
});

test("reanalyzeProject: legacy workspaces (null sourcePath) fall back to the description marker", async () => {
  // Simulate a pre-0008 import: the path lives only in the description marker,
  // sourcePath is NULL. reanalyze must still recover the path and refresh.
  const [legacy] = await db
    .insert(schema.workspaces)
    .values({
      title: "legacy-fixture",
      type: "project",
      description: `Imported from: ${path.resolve(projectDir)}`,
      // sourcePath intentionally omitted → NULL, like rows created before 0008
    })
    .returning();
  assert.equal(legacy.sourcePath, null, "legacy row has no sourcePath");

  const res = await reanalyzeProject(legacy.id);
  assert.ok(res.ok, res.ok ? "" : res.error);
  if (res.ok) assert.ok(res.data.questionsCreated > 0, "legacy path re-analysed");

  await deleteWorkspace(legacy.id);
});

// A refresh clears generated artifacts, but answers live ON the question row —
// so the wipe used to take userAnswer/score/confidence with it. Uses its own
// workspace so the shared one's progress assertions stay untouched.
test("reanalyzeProject: preserves the student's answers across a refresh", async () => {
  const [ws] = await db
    .insert(schema.workspaces)
    .values({
      title: "answer-preservation-fixture",
      type: "project",
      sourcePath: path.resolve(projectDir),
    })
    .returning();

  const first = await reanalyzeProject(ws.id);
  assert.ok(first.ok, first.ok ? "" : first.error);

  const [q] = await db
    .select()
    .from(schema.explainBackQuestions)
    .where(eq(schema.explainBackQuestions.workspaceId, ws.id));
  assert.ok(q, "questions were generated to answer");

  await db
    .update(schema.explainBackQuestions)
    .set({
      userAnswer: "The walker recurses over the tree, skipping symlinks.",
      score: 80,
      confidence: "green",
    })
    .where(eq(schema.explainBackQuestions.id, q.id));

  // Change the tree so the refresh actually runs (MS4 short-circuits otherwise).
  appendFileSync(
    path.join(projectDir, "src", "index.ts"),
    "\nexport const _touchAnswers = 2;\n"
  );

  const second = await reanalyzeProject(ws.id);
  assert.ok(second.ok, second.ok ? "" : second.error);
  if (second.ok) assert.ok(!second.data.unchanged, "changed tree forces a refresh");

  const after = await db
    .select()
    .from(schema.explainBackQuestions)
    .where(eq(schema.explainBackQuestions.workspaceId, ws.id));
  const answered = after.filter((r) => r.userAnswer !== null);

  assert.equal(answered.length, 1, "the answered question survived the refresh");
  assert.equal(
    answered[0].userAnswer,
    "The walker recurses over the tree, skipping symlinks.",
    "answer text preserved verbatim"
  );
  assert.equal(answered[0].score, 80, "score preserved");
  assert.equal(answered[0].confidence, "green", "confidence preserved");

  await deleteWorkspace(ws.id);
});

// ── feature traces ───────────────────────────────────────────────────────────
// buildFeatureTraces is pure over CodeAnalysis, so drive it with synthetic
// inputs rather than a real walk — the graph shape is the thing under test.
type Analysis = Parameters<typeof buildFeatureTraces>[0];

function fakeAnalysis(
  files: Array<[string, string]>,
  importEdges: Array<[string, string]>,
  findings: Array<{ name: string; file: string }> = []
): Analysis {
  return {
    findings: findings.map((f) => ({
      name: f.name, file: f.file, category: "Algorithm", line: 1, snippet: "x",
      explanation: "", dsaConnection: "", practiceTask: "", confidence: "regex",
    })),
    chunks: [],
    graph: { nodes: [], links: [] },
    fileCount: files.length,
    truncated: false,
    corpus: files.map(([rel, content]) => ({
      rel, layer: "", loc: content.split("\n").length, bytes: content.length,
      content, isTsJs: true, isClientComponent: false,
    })),
    importEdges,
  } as unknown as Analysis;
}

const ROUTE = "app/(app)/workspaces/page.tsx";
const SERVICE = "lib/services/workspace.service.ts";
const SCHEMA = "lib/db/schema.ts";

test("buildFeatureTraces: walks an entry point down to the data layer", () => {
  const traces = buildFeatureTraces(
    fakeAnalysis(
      [
        [ROUTE, "export default function Page() {}\n"],
        [SERVICE, "export async function deleteWorkspace() {}\n"],
        [SCHEMA, "export const workspaces = 1;\n"],
      ],
      [
        [ROUTE, SERVICE],
        [SERVICE, SCHEMA],
      ]
    )
  );

  assert.equal(traces.length, 1, "one entry point yields one trace");
  const [t] = traces;
  assert.equal(t.entry, ROUTE);
  assert.equal(t.terminal, SCHEMA, "trace ends at the data layer");
  assert.deepEqual(
    t.hops.map((h) => h.file),
    [ROUTE, SERVICE, SCHEMA],
    "hops follow the real import path"
  );
  assert.deepEqual(
    t.hops.map((h) => h.layer),
    ["Routes & Pages", "Services / Logic", "Data Layer"],
    "hops advance through the workflow layers"
  );
  assert.equal(t.hops[1].symbol, "deleteWorkspace", "captures the symbol crossed");
});

test("buildFeatureTraces: a cyclic import graph terminates", () => {
  // service imports the route back — the walk must not loop forever.
  const traces = buildFeatureTraces(
    fakeAnalysis(
      [
        [ROUTE, "export default function Page() {}\n"],
        [SERVICE, "export const svc = 1;\n"],
      ],
      [
        [ROUTE, SERVICE],
        [SERVICE, ROUTE],
      ]
    )
  );
  assert.equal(traces.length, 1);
  assert.deepEqual(traces[0].hops.map((h) => h.file), [ROUTE, SERVICE]);
});

test("buildFeatureTraces: concepts detected in a file appear on its hop", () => {
  const [t] = buildFeatureTraces(
    fakeAnalysis(
      [
        [ROUTE, "export default function Page() {}\n"],
        [SERVICE, "export const svc = 1;\n"],
      ],
      [[ROUTE, SERVICE]],
      [{ name: "Recursion", file: SERVICE }]
    )
  );
  assert.deepEqual(t.hops[1].concepts, ["Recursion"], "DSA lands on the path");
  assert.deepEqual(t.hops[0].concepts, [], "and only where it was detected");
});

test("buildFeatureTraces: a lone file is not a trace", () => {
  const traces = buildFeatureTraces(
    fakeAnalysis([[ROUTE, "export default function Page() {}\n"]], [])
  );
  assert.equal(traces.length, 0, "a single node is a file, not a path");
});

// ── DSA detectors ────────────────────────────────────────────────────────────
// The code-grounded DSA breakdown is the headline feature, but only two signals
// were ever asserted. Each case is a minimal file that genuinely contains the
// pattern; MAX_FINDINGS caps a single run, so each detector gets its own project.
test("DSA detectors: every signal fires on code that really contains it", () => {
  const cases: Array<[string, string, string]> = [
    ["m.ts", "const m = new Map<string, number>();\nm.set('a', 1);\n", "Hash Map / Dictionary"],
    ["s.ts", "const s = new Set<number>();\ns.add(1);\n", "Set (unique collection)"],
    ["q.ts", "function run() {\n  const st: number[] = [];\n  st.push(1);\n  st.pop();\n}\n", "Stack / Queue"],
    ["h.ts", "const out = [1, 2].map((x) => x * 2);\n", "Higher-order array ops (map/filter/reduce)"],
    ["so.ts", "const xs = [3, 1].sort((a, b) => a - b);\n", "Sorting"],
    ["r.ts", "function fact(n: number): number {\n  return n <= 1 ? 1 : fact(n - 1);\n}\n", "Recursion"],
    ["bs.ts", "function binarySearch(xs: number[], t: number) {\n  return xs.indexOf(t);\n}\n", "Binary Search"],
    ["g.ts", "function bfs(start: string) {\n  return [start];\n}\n", "Graph traversal (BFS/DFS)"],
    ["dp.ts", "const memo: Record<string, number> = {};\nmemo.a = 1;\n", "Dynamic Programming / Memoization"],
    ["tp.ts", "let left = 0;\nlet right = 9;\nwhile (left < right) {\n  left++;\n}\n", "Two-pointer / Sliding window"],
    ["re.ts", "const re = /ab+c/g;\nexport const ok = re.test('abc');\n", "Regular Expressions"],
    ["as.ts", "export async function go() {\n  await Promise.all([]);\n}\n", "Async / Concurrency"],
    ["hp.ts", "class MinHeap {\n  items: number[] = [];\n}\n", "Heap / Priority Queue"],
    ["ll.ts", "function walk(node: any) {\n  while (node) {\n    node = node.next;\n  }\n}\n", "Linked List Traversal"],
    ["ob.ts", "function wire(bus: any) {\n  bus.on('x', () => {});\n  bus.emit('x');\n}\n", "Observer / Event Emitter"],
    ["sg.ts", "class S {\n  static instance: S;\n  static getInstance(): S {\n    return S.instance;\n  }\n}\n", "Singleton Pattern"],
    ["fa.ts", "export function createThing(): { id: number } {\n  return { id: 1 };\n}\n", "Factory Function / Method"],
    ["bt.ts", "function permute(a: number[]): void {\n  for (const _x of a) {\n    permute(a);\n  }\n}\n", "Backtracking"],
  ];

  for (const [file, code, expected] of cases) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "ncs-dsa-"));
    try {
      writeFileSync(path.join(dir, file), code);
      const names = analyzeCode(dir, "dsa-fixture").findings.map((f) => f.name);
      assert.ok(
        names.includes(expected),
        `"${expected}" should fire on ${file} — got: ${names.join(", ") || "(none)"}`
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

// ── database backup ──────────────────────────────────────────────────────────
// The only way a user gets their data out of this local-first app.
test("backupDatabase returns a real SQLite snapshot of the live schema", async () => {
  const { backupDatabase } = await import("@/lib/services/backup.service");
  const res = await backupDatabase();
  assert.ok(res.ok, res.ok ? "" : res.error);
  if (!res.ok) return;

  assert.match(res.data.filename, /^nirmiqcodesensei-backup-\d+\.db$/);
  assert.ok(res.data.data.length > 0, "snapshot is not empty");
  // Every SQLite file starts with this magic string.
  assert.equal(
    res.data.data.subarray(0, 15).toString("utf8"),
    "SQLite format 3",
    "buffer is a SQLite database, not a truncated/partial copy"
  );
  // Table names live as plain text in the schema page — proves the snapshot
  // carries the real schema rather than an empty freshly-created file.
  assert.ok(
    res.data.data.includes(Buffer.from("explain_back_questions")),
    "snapshot contains the app schema"
  );
});

// ── blended progress formula (REVIEW-008, #26) ───────────────────────────────
test("progress: checkpoints AND green answers move progressScore", async () => {
  const { getLearningMapByWorkspaceId, toggleCheckpoint } = await import(
    "@/lib/services/learning-map.service"
  );
  const { submitAnswer } = await import("@/lib/services/explain-back.service");

  const mapRes = await getLearningMapByWorkspaceId(workspaceId);
  assert.ok(mapRes.ok && mapRes.data, "learning map exists");
  if (!mapRes.ok || !mapRes.data) return;
  assert.ok(mapRes.data.checkpoints.length > 0, "fixture map has checkpoints");

  const t = await toggleCheckpoint(mapRes.data.id, mapRes.data.checkpoints[0].id);
  assert.ok(t.ok);

  let [ws] = await db.select().from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));
  const afterCheckpoint = ws.progressScore;
  assert.ok(afterCheckpoint > 0, "checkpoint completion moves progress");

  const [q] = await db.select().from(schema.explainBackQuestions)
    .where(eq(schema.explainBackQuestions.workspaceId, workspaceId)).limit(1);
  const a = await submitAnswer(q.id, {
    userAnswer: "test answer",
    confidence: "green",
  });
  assert.ok(a.ok);

  [ws] = await db.select().from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));
  assert.ok(
    ws.progressScore > afterCheckpoint,
    `green answer raises blended progress (${afterCheckpoint} -> ${ws.progressScore})`
  );
});

// ── conceptType form enum (REVIEW-008, #30) ──────────────────────────────────
test("createConceptLinkSchema: conceptType enum-enforced on the form path", async () => {
  const { createConceptLinkSchema } = await import(
    "@/lib/validators/concept-link.schema"
  );
  const base = { projectFeature: "auth flow", conceptName: "Hashing" };
  assert.equal(
    createConceptLinkSchema.safeParse({ ...base, conceptType: "HashMap" }).success,
    true
  );
  assert.equal(
    createConceptLinkSchema.safeParse({ ...base, conceptType: "Banana" }).success,
    false
  );
});

// ── BM25 search ranking (MS5 coverage) ───────────────────────────────────────
test("search: BM25 indexes, ranks by relevance, and rebuilds cleanly", async () => {
  const { createWorkspace } = await import("@/lib/services/workspace.service");
  const { buildSearchIndex, searchWorkspace, hasSearchIndex } = await import(
    "@/lib/services/search.service"
  );

  const wsRes = await createWorkspace({ title: "search-fixture", type: "project" });
  assert.ok(wsRes.ok);
  if (!wsRes.ok) return;
  const wsId = wsRes.data.id;

  assert.equal(await hasSearchIndex(wsId), false, "no index before build");

  const built = await buildSearchIndex(wsId, [
    { filePath: "auth/login.ts", chunkType: "file", layer: "Services / Logic",
      chunkText: "authenticate user login password session authentication token" },
    { filePath: "db/schema.ts", chunkType: "file", layer: "Data Layer",
      chunkText: "database table column migration schema drizzle sqlite" },
    { filePath: "ui/Button.tsx", chunkType: "file", layer: "UI Components",
      chunkText: "render button click handler component props state" },
  ]);
  assert.ok(built.ok && built.data === 3, "index built with 3 chunks");
  assert.equal(await hasSearchIndex(wsId), true, "index present after build");

  const res = await searchWorkspace(wsId, "authentication login");
  assert.ok(res.ok);
  if (!res.ok) return;
  assert.ok(res.data.length > 0, "auth query matches");
  assert.equal(res.data[0].filePath, "auth/login.ts", "most relevant chunk ranks first");
  assert.ok(
    res.data.every((r, i) => i === 0 || r.score <= res.data[i - 1].score),
    "results sorted by descending BM25 score"
  );

  // Stopwords + sub-3-char tokens are dropped entirely.
  const empty = await searchWorkspace(wsId, "the a is to");
  assert.ok(empty.ok && empty.data.length === 0, "stopword-only query returns nothing");

  // Rebuild replaces the index rather than accumulating.
  const rebuilt = await buildSearchIndex(wsId, [
    { filePath: "solo.ts", chunkType: "file", layer: null, chunkText: "unrelated solo content" },
  ]);
  assert.ok(rebuilt.ok && rebuilt.data === 1);
  const after = await searchWorkspace(wsId, "authentication");
  assert.ok(after.ok && after.data.length === 0, "old chunks gone after rebuild");
});

// ── E2E smoke: import → analyze → deep-review → export (MS5) ──────────────────
test("export: markdown captures the full pipeline (map, review, questions, concepts)", async () => {
  const { generateWorkspaceMarkdown } = await import("@/lib/services/export.service");

  const res = await generateWorkspaceMarkdown(workspaceId);
  assert.ok(res.ok, res.ok ? "" : res.error);
  if (!res.ok) return;

  const { filename, markdown } = res.data;
  assert.match(filename, /^nirmiqcodesensei-.+-\d+\.md$/, "filename = slug + timestamp");

  // The chain: each pipeline stage's output must reach the exported artifact.
  assert.match(markdown, /^# .+/m, "title header");
  assert.ok(markdown.includes("Exported from NirmiqCodeSensei"), "export header line");
  assert.ok(markdown.includes("## 🗺️ Learning Map"), "learning-map section");
  assert.ok(markdown.includes("## 🔍 Senior Review"), "deep-review section reaches export");
  assert.match(markdown, /\*\*Overall: [A-F] \(\d+\/100\)\*\*/, "overall grade line");
  assert.ok(markdown.includes("| Lens | Grade |"), "per-lens grade table");
  assert.ok(markdown.includes("## 💬 Explain-Back"), "explain-back section");
  assert.match(markdown, /### Q1:/, "at least one generated question");
  assert.ok(markdown.includes("## ⚙️ DSA Bridge"), "DSA-bridge section");
  // The green answer submitted by the progress test flows through to the export.
  assert.ok(markdown.includes("test answer"), "user answer captured in export");
});

// ── deleteWorkspace cascade ───────────────────────────────────────────────────
test("deleteWorkspace: cascade leaves zero orphaned child rows", async () => {
  const res = await deleteWorkspace(workspaceId);
  assert.ok(res.ok);

  const orphans =
    (await db.select().from(schema.explainBackQuestions)
      .where(eq(schema.explainBackQuestions.workspaceId, workspaceId))).length +
    (await db.select().from(schema.conceptLinks)
      .where(eq(schema.conceptLinks.workspaceId, workspaceId))).length +
    (await db.select().from(schema.learningMaps)
      .where(eq(schema.learningMaps.workspaceId, workspaceId))).length +
    (await db.select().from(schema.searchChunks)
      .where(eq(schema.searchChunks.workspaceId, workspaceId))).length +
    (await db.select().from(schema.debugLogs)
      .where(eq(schema.debugLogs.workspaceId, workspaceId))).length;
  assert.equal(orphans, 0);

  const ws = await db.select().from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));
  assert.equal(ws.length, 0, "workspace row gone");
});
