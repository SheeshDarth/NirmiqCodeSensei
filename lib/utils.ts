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
