import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { forbiddenReasons } = await import("../scripts/publish-guard.mjs");
const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");

test("publish guard blocks every file class that must never reach npm", () => {
  const blocked: [string, RegExp][] = [
    ["data/nirmiqcodesensei.db", /local database/],
    ["data/imported-projects/x/src/a.ts", /local database/],
    ["server.db", /SQLite/],
    ["x/app.db-wal", /SQLite/],
    ["x/app.db-shm", /SQLite/],
    [".env", /environment/],
    [".env.local", /environment/],
    ["config/.env.production", /environment/],
    ["node_modules/better-sqlite3/build/Release/better_sqlite3.node", /native binary/],
    [".git/config", /git history/],
    ["node_modules/pkg/.git/HEAD", /git history/],
    [".gitignore", /root ignore/],
    [".npmignore", /root ignore/],
  ];
  for (const [file, why] of blocked) {
    const reasons = forbiddenReasons(file);
    assert.ok(reasons.some((r: string) => why.test(r)), `${file} should be blocked as ${why}`);
  }
});

test("publish guard is separator-agnostic, so Windows paths are caught too", () => {
  assert.ok(forbiddenReasons("data\\nirmiqcodesensei.db").length > 0);
  assert.ok(forbiddenReasons("data\\imported-projects\\x\\a.ts").length > 0);
  assert.ok(forbiddenReasons("config\\.env.local").length > 0);
  assert.ok(forbiddenReasons("node_modules\\pkg\\.git\\HEAD").length > 0);
});

test("publish guard leaves legitimate runtime files alone", () => {
  const fine = [
    "server.js",
    "package.json",
    ".next/static/chunks/app.js",
    "node_modules/next/dist/server/next.js",
    "node_modules/some-pkg/.gitignore", // inert: only a dist-root ignore file is dangerous
    "lib/data/helpers.js", // 'data' is only forbidden at the top level
    "public/environment.txt",
    "mcp-server.cjs",
  ];
  for (const file of fine) {
    assert.deepEqual(forbiddenReasons(file), [], `${file} should be allowed`);
  }
});

test("pack-standalone uses the tested guard instead of its own copy of the rules", () => {
  const pack = readFileSync(path.join(scripts, "pack-standalone.mjs"), "utf8");
  assert.match(pack, /from "\.\/publish-guard\.mjs"/);
  assert.match(pack, /forbiddenReasons\(/);
  assert.doesNotMatch(pack, /const FORBIDDEN\s*=/);
});
