import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const temp = mkdtempSync(path.join(os.tmpdir(), "ncs-demo-"));
process.env.NCS_DATA_DIR = path.join(temp, "database");
const { db, sqliteConnection } = await import("@/lib/db/client");
const { runMigrations } = await import("@/lib/db/migrate");
runMigrations();
const schema = await import("@/lib/db/schema");
const { eq } = await import("drizzle-orm");
const { importDemoProject } = await import("@/lib/services/demo.service");
const { normalizeSnapshot } = await import("@/lib/pathways/snapshot");
const { DEMO_DIR, DEMO_FILES } = await import("@/lib/demo/project");

after(() => {
  sqliteConnection.close();
  assert.ok(path.resolve(temp).startsWith(path.join(os.tmpdir(), "ncs-demo-")));
  rmSync(temp, { recursive: true, force: true });
});

test("demo import produces a real, non-empty analysis and is idempotent", async () => {
  const base = path.join(temp, "imported");
  const first = await importDemoProject(base);
  assert.ok(first.ok, first.ok ? "" : first.error);
  assert.equal(first.data.existed, false);
  const id = first.data.workspaceId;

  const root = path.join(base, DEMO_DIR);
  for (const rel of Object.keys(DEMO_FILES)) {
    assert.ok(statSync(path.join(root, rel)).isFile(), `${rel} written`);
  }
  assert.equal(readFileSync(path.join(root, "lib", "cache.ts"), "utf8"), DEMO_FILES["lib/cache.ts"]);

  const [ws] = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, id));
  assert.equal(ws.sourcePath, path.resolve(root));

  const [map] = await db.select().from(schema.learningMaps).where(eq(schema.learningMaps.workspaceId, id));
  assert.ok(map, "learning map created");
  assert.ok(map.seniorReviewJson, "deep review stored");
  const snapshot = normalizeSnapshot(map.featureTracesJson, map.id);
  assert.ok(snapshot.paths.length > 0, "demo has at least one walkthrough path");
  assert.ok(
    snapshot.paths.some((p) => p.hops.length >= 3),
    "a route → service → store path is detected"
  );

  const questions = await db.select().from(schema.explainBackQuestions).where(eq(schema.explainBackQuestions.workspaceId, id));
  assert.ok(questions.length > 0, "explain-back questions generated");
  assert.ok(
    questions.some((q) => q.question.includes("isBlocked") && q.expectedPointsJson.includes("cycle")),
    "curated code-grounded demo questions are present"
  );
  const concepts = await db.select().from(schema.conceptLinks).where(eq(schema.conceptLinks.workspaceId, id));
  assert.ok(concepts.some((c) => c.sourceFile), "code-grounded DSA findings generated");

  // Second call reopens the same workspace and must not rewrite files.
  const mtime = statSync(path.join(root, "package.json")).mtimeMs;
  const second = await importDemoProject(base);
  assert.ok(second.ok && second.data.existed && second.data.workspaceId === id);
  assert.equal(statSync(path.join(root, "package.json")).mtimeMs, mtime);
  const all = await db.select().from(schema.workspaces);
  assert.equal(all.length, 1, "no duplicate workspace");
});
