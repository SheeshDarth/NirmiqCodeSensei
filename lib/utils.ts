/**
 * Client-safe utilities — no server-only imports allowed in this file.
 */

/** Parse expected-points JSON string stored in SQLite → string[] */
export function parseExpectedPoints(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed as string[];
    if (typeof parsed === "string") return [parsed];
    return [];
  } catch {
    return [];
  }
}

export type Level = "red" | "yellow" | "green";
const RANK: Record<Level, number> = { red: 0, yellow: 1, green: 2 };
const STOP = new Set(
  "a an the and or of to in on for with is are was be it its this that as at by from into how why what when which does do uses use used not can will would".split(" ")
);

function keywords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(ing|ed|es|s)$/, ""));
}

/**
 * Heuristic 0-100: share of key points whose keywords mostly appear in the
 * answer. A keyword-overlap signal, NOT a grade of correctness. null when there
 * are no key points to compare against.
 */
export function keyPointCoverage(answer: string, points: string[]): number | null {
  const usable = points.filter((p) => keywords(p).length > 0);
  if (usable.length === 0) return null;
  const have = new Set(keywords(answer));
  const hit = usable.filter((p) => {
    const kw = keywords(p);
    return kw.filter((w) => have.has(w)).length / kw.length >= 0.5;
  }).length;
  return Math.round((hit / usable.length) * 100);
}

/** Coverage → level: >=70 green, >=40 yellow, else red. */
export function coverageLevel(score: number): Level {
  return score >= 70 ? "green" : score >= 40 ? "yellow" : "red";
}

/** Days to wait before re-asking an answered question, by how well the last answer went. */
export const REVIEW_DAYS: Record<Level, number> = { red: 1, yellow: 3, green: 7 };

/** When a question answered at `answeredAt` (Unix ms) should be revisited. */
export function reviewDueAt(answeredAt: number, level: Level): number {
  return answeredAt + REVIEW_DAYS[level] * 86_400_000;
}

/** Answered questions only; unanswered ones are not "due", they are just unseen. */
export function isDueForReview(
  q: { userAnswer: string | null; updatedAt: number },
  level: Level | null,
  now: number = Date.now()
): boolean {
  if (!q.userAnswer || !level) return false;
  return reviewDueAt(q.updatedAt, level) <= now;
}

export type Calibration = "overconfident" | "aligned" | "underconfident";

/** Compare what the learner predicted against what actually happened. */
export function classifyCalibration(predicted: Level, actual: Level): Calibration {
  const d = RANK[predicted] - RANK[actual];
  return d > 0 ? "overconfident" : d < 0 ? "underconfident" : "aligned";
}

/** Format a Unix-ms timestamp to a readable date string */
export function formatDate(
  ms: number,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
): string {
  return new Date(ms).toLocaleDateString("en-US", options);
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
