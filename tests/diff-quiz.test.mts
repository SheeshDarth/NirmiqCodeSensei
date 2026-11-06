import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const temp = mkdtempSync(path.join(os.tmpdir(), "ncs-diffquiz-"));
process.env.NCS_DATA_DIR = path.join(temp, "database");
const { db, sqliteConnection } = await import("@/lib/db/client");
const { runMigrations } = await import("@/lib/db/migrate");
runMigrations();
const schema = await import("@/lib/db/schema");
const { keyPointCoverage, coverageLevel, classifyCalibration } = await import("@/lib/utils");
const { parseDiff, extractSymbols, extractImports, buildDiffQuestions, getDiffContext, createDiffQuiz } =
  await import("@/lib/services/diff-quiz.service");
const { createQuestion, submitAnswer, getCalibration, getQuestionsByWorkspaceId } =
  await import("@/lib/services/explain-back.service");

after(() => {
  sqliteConnection.close();
  assert.ok(path.resolve(temp).startsWith(path.join(os.tmpdir(), "ncs-diffquiz-")));
  rmSync(temp, { recursive: true, force: true });
});

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-C", cwd, ...args], { stdio: "pipe" }).toString();

async function workspaceAt(sourcePath: string | null) {
  const [ws] = await db
    .insert(schema.workspaces)
    .values({ title: "fixture", type: "project", sourcePath })
    .returning();
  return ws.id;
}

test("keyPointCoverage is a bounded keyword heuristic; calibration compares levels", () => {
  const points = ["uses a hash map for constant time lookup", "validates the token expiry"];
  assert.equal(keyPointCoverage("", []), null);
  assert.equal(keyPointCoverage("nothing relevant", points), 0);
  assert.equal(keyPointCoverage("It does a lookup in a hash map and validates token expiry", points), 100);
  assert.equal(coverageLevel(100), "green");
  assert.equal(coverageLevel(50), "yellow");
  assert.equal(coverageLevel(10), "red");
  assert.equal(classifyCalibration("green", "red"), "overconfident");
  assert.equal(classifyCalibration("yellow", "yellow"), "aligned");
  assert.equal(classifyCalibration("red", "green"), "underconfident");
});

test("parseDiff extracts symbols/imports, redacts secrets and skips blocked or non-source paths", () => {
  const diff = [
    "diff --git a/src/auth.ts b/src/auth.ts",
    "--- a/src/auth.ts",
    "+++ b/src/auth.ts",
    "@@ -0,0 +1,5 @@",
    '+import jwt from "jsonwebtoken";',
    '+import { x } from "./local";',
    "+export async function verifyToken(token: string, opts?: Opts) {",
    '+  const apiKey = "sk-live-123";',
    '+  if (!token) throw new Error("missing");',
    "diff --git a/.env b/.env",
    "--- a/.env",
    "+++ b/.env",
    "+SECRET=1",
    "diff --git a/node_modules/x/index.js b/node_modules/x/index.js",
    "--- a/node_modules/x/index.js",
    "+++ b/node_modules/x/index.js",
    "+module.exports = 1",
    "diff --git a/README.md b/README.md",
    "--- a/README.md",
    "+++ b/README.md",
    "+hello",
  ].join("\n");
  const files = parseDiff(diff);
  assert.equal(files.length, 1);
  const f = files[0];
  assert.equal(f.path, "src/auth.ts");
  assert.deepEqual(f.symbols, [{ name: "verifyToken", params: ["token", "opts"] }]);
  assert.deepEqual(f.imports, ["jsonwebtoken"]);
  assert.equal(f.errorHandling, 1);
  assert.ok(f.excerpt.includes("[redacted]"));
  assert.ok(!f.excerpt.some((l) => l.includes("sk-live")));
  assert.deepEqual(extractSymbols(["const add = (a, b) => a + b;", "def run(x, y=1):"]).map((s) => s.name), ["add", "run"]);
  assert.deepEqual(extractImports(["import os", "from pathlib import Path", 'const m = require("lodash")']), ["os", "pathlib", "lodash"]);
  const qs = buildDiffQuestions({ range: "r", files, truncated: false });
  assert.match(qs[0].question, /verifyToken/);
  assert.ok(qs[0].expectedPoints.includes("verifyToken(token, opts)"));
});

test("diff quiz reads uncommitted + untracked work, dedupes, and rejects bad input", async () => {
  const repo = path.join(temp, "repo");
  mkdirSync(path.join(repo, "src"), { recursive: true });
  git(repo, "init", "-q");
  git(repo, "config", "user.email", "t@example.com");
  git(repo, "config", "user.name", "t");
  writeFileSync(path.join(repo, "src", "a.ts"), "export const one = () => 1;\n");
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "init");
  writeFileSync(path.join(repo, "src", "a.ts"), "export const one = () => 1;\nexport function two(n: number) { return n * 2; }\n");
  writeFileSync(path.join(repo, "src", "b.ts"), "export function three() { return 3; }\n");
  writeFileSync(path.join(repo, ".env"), "SECRET=abc\n");

  const id = await workspaceAt(repo);
  const ctx = await getDiffContext(id);
  assert.ok(ctx.ok);
  assert.deepEqual(ctx.data.files.map((f) => f.path).sort(), ["src/a.ts", "src/b.ts"]);
  assert.ok(ctx.data.files.find((f) => f.path === "src/b.ts")!.untracked);

  const first = await createDiffQuiz(id);
  assert.ok(first.ok && first.data.created >= 2);
  const second = await createDiffQuiz(id);
  assert.ok(second.ok && second.data.created === 0 && second.data.skipped >= 2);
  const qs = await getQuestionsByWorkspaceId(id);
  assert.ok(qs.ok && qs.data.every((q) => q.origin === "diff"));

  const bad = await getDiffContext(id, "--output=evil");
  assert.ok(!bad.ok && bad.code === "BAD_REF");
  const plain = await workspaceAt(path.join(temp, "database"));
  const notGit = await getDiffContext(plain);
  assert.ok(!notGit.ok && notGit.code === "NOT_GIT");
  const none = await getDiffContext(await workspaceAt(null));
  assert.ok(!none.ok && none.code === "NO_SOURCE");
});

test("prediction is stored once; score comes from coverage; calibration is summarised", async () => {
  const id = await workspaceAt(null);
  const made = await createQuestion(id, {
    question: "Why a hash map?",
    difficulty: "beginner",
    expectedPoints: "constant time lookup\navoids scanning the list",
  });
  assert.ok(made.ok);

  const r1 = await submitAnswer(made.data.id, {
    userAnswer: "constant time lookup and it avoids scanning the list",
    confidence: "green",
    predictedConfidence: "red",
  });
  assert.ok(r1.ok);
  assert.equal(r1.data.predictedConfidence, "red");
  assert.equal(r1.data.score, 100);
  const mid = await getCalibration(id);
  assert.ok(mid.ok && mid.data.underconfident === 1 && mid.data.accuracy === 0);

  const r2 = await submitAnswer(made.data.id, {
    userAnswer: "something else entirely",
    confidence: "red",
    predictedConfidence: "green",
  });
  assert.ok(r2.ok);
  assert.equal(r2.data.predictedConfidence, "red", "prediction must not be rewritten");
  assert.equal(r2.data.score, 0);

  const cal = await getCalibration(id);
  assert.ok(cal.ok);
  assert.deepEqual(
    { m: cal.data.measured, a: cal.data.aligned, u: cal.data.underconfident, o: cal.data.overconfident },
    { m: 1, a: 1, u: 0, o: 0 }
  );
  assert.equal(cal.data.accuracy, 100);
});
