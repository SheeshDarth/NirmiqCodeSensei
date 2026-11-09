import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

// The service graph opens the DB on import; keep it isolated from real data.
const temp = mkdtempSync(path.join(os.tmpdir(), "ncs-review-"));
process.env.NCS_DATA_DIR = path.join(temp, "database");
const { sqliteConnection } = await import("@/lib/db/client");
const { REVIEW_DAYS, reviewDueAt, isDueForReview } = await import("@/lib/utils");
const { isDiffable } = await import("@/lib/services/diff-quiz.service");

after(() => {
  sqliteConnection.close();
  assert.ok(path.resolve(temp).startsWith(path.join(os.tmpdir(), "ncs-review-")));
  rmSync(temp, { recursive: true, force: true });
});

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

test("review intervals grow with how well the last answer went", () => {
  assert.ok(REVIEW_DAYS.red < REVIEW_DAYS.yellow);
  assert.ok(REVIEW_DAYS.yellow < REVIEW_DAYS.green);
  assert.equal(reviewDueAt(T0, "red"), T0 + DAY);
  assert.equal(reviewDueAt(T0, "green"), T0 + 7 * DAY);
});

test("a question is due exactly when its interval has elapsed", () => {
  const q = { userAnswer: "my answer", updatedAt: T0 };
  assert.equal(isDueForReview(q, "red", T0 + DAY - 1), false);
  assert.equal(isDueForReview(q, "red", T0 + DAY), true);
  assert.equal(isDueForReview(q, "green", T0 + 6 * DAY), false);
  assert.equal(isDueForReview(q, "green", T0 + 7 * DAY), true);
});

test("unanswered or ungraded questions are never due", () => {
  assert.equal(isDueForReview({ userAnswer: null, updatedAt: T0 }, "red", T0 + 99 * DAY), false);
  assert.equal(isDueForReview({ userAnswer: "", updatedAt: T0 }, "red", T0 + 99 * DAY), false);
  assert.equal(isDueForReview({ userAnswer: "x", updatedAt: T0 }, null, T0 + 99 * DAY), false);
});

test("an app-managed copy nested in another repo is not diffable until it has its own history", async () => {
  const { IMPORTED_PROJECTS_DIR } = await import("@/lib/services/project-analyzer.service");
  mkdirSync(IMPORTED_PROJECTS_DIR, { recursive: true });
  const dir = mkdtempSync(path.join(IMPORTED_PROJECTS_DIR, "ncs-nested-"));
  try {
    // Sits inside whatever repository contains data/ (or none): either way, no own history.
    assert.equal(await isDiffable(dir), false);
    execFileSync("git", ["-C", dir, "init", "-q"], { stdio: "pipe" });
    assert.equal(await isDiffable(dir), true);
  } finally {
    assert.ok(path.resolve(dir).startsWith(path.join(IMPORTED_PROJECTS_DIR, "ncs-nested-")));
    rmSync(dir, { recursive: true, force: true });
  }
});

test("isDiffable is true only for a folder inside a git work tree", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ncs-diffable-"));
  try {
    assert.equal(await isDiffable(null), false);
    assert.equal(await isDiffable(undefined), false);
    assert.equal(await isDiffable(path.join(dir, "missing")), false);
    // os.tmpdir() is not inside a repository, so a plain folder is not diffable.
    assert.equal(await isDiffable(dir), false);
    execFileSync("git", ["-C", dir, "init", "-q"], { stdio: "pipe" });
    assert.equal(await isDiffable(dir), true);
  } finally {
    assert.ok(path.resolve(dir).startsWith(path.join(os.tmpdir(), "ncs-diffable-")));
    rmSync(dir, { recursive: true, force: true });
  }
});
