import { closeSync, fstatSync, lstatSync, openSync, readSync, realpathSync } from "fs";
import path from "path";
import { digest } from "@/lib/pathways/snapshot";
import type { SourceExcerpt } from "@/lib/pathways/shared";
import type { ServiceResult } from "@/lib/types";
import { getWorkspaceById } from "./workspace.service";
import { getPathwaySnapshot } from "./pathway.service";

const ALLOWED = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|cs|rb|php|vue|svelte)$/i;
const BLOCKED = /(^|\/)(\.[^/]+|node_modules|vendor|dist|build|coverage|credentials?|secrets?)(\/|$)/i;
/** Paths that must never be read or summarised (dot-dirs, deps, build output, credentials). */
export const BLOCKED_SOURCE_PATH = BLOCKED;

/** Read a descriptor only after resolving a server-owned snapshot target. Never execute source. */
export function readConfinedSource(root: string, file: string, expectedHash: string | null, anchorLine = 1): ServiceResult<SourceExcerpt> {
  let fd: number | undefined;
  const fail = (code: string, error: string): ServiceResult<SourceExcerpt> => ({ ok: false, code, error });
  try {
    if (!ALLOWED.test(file) || BLOCKED.test(file) || file.includes("\\") || file.includes("\0") || file.split("/").some(p => !p || p === "." || p === "..") || path.isAbsolute(file)) return fail("FORBIDDEN", "This source target is not permitted.");
    const canonicalRoot = realpathSync(root);
    let candidate = canonicalRoot;
    for (const part of file.split("/")) {
      candidate = path.join(candidate, part);
      if (lstatSync(candidate).isSymbolicLink()) return fail("FORBIDDEN", "Linked source files and directories cannot be opened.");
    }
    const resolved = realpathSync(candidate);
    const relative = path.relative(canonicalRoot, resolved);
    if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) return fail("FORBIDDEN", "Source lies outside this workspace.");
    const before = lstatSync(resolved);
    if (!before.isFile() || before.size > 80_000) return fail("TOO_LARGE", "Source preview is limited to regular files up to 80 KB.");
    fd = openSync(resolved, "r");
    const opened = fstatSync(fd);
    if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size > 80_000 || realpathSync(candidate) !== resolved) return fail("SOURCE_CHANGED", "Source changed while opening. Try again.");
    const bytes = Buffer.alloc(80_001);
    let count = 0;
    while (count < bytes.length) { const n = readSync(fd, bytes, count, bytes.length - count, count); if (!n) break; count += n; }
    const after = fstatSync(fd);
    if (count > 80_000) return fail("TOO_LARGE", "Source preview is limited to 80 KB.");
    if (after.mtimeMs !== opened.mtimeMs || after.size !== opened.size || realpathSync(candidate) !== resolved) return fail("SOURCE_CHANGED", "Source changed while reading. Try again.");
    const content = bytes.subarray(0, count).toString("utf8");
    if (content.includes("\0") || content.includes("\ufffd")) return fail("UNSUPPORTED", "This source is not supported UTF-8 text.");
    const hash = digest(content);
    const freshness = expectedHash ? hash === expectedHash ? "matches" : "changed" : "unknown";
    const lines = content.split("\n");
    const anchor = Math.min(lines.length, Math.max(1, Number.isFinite(anchorLine) ? Math.floor(anchorLine) : 1));
    const start = Math.max(1, anchor - 20);
    const end = Math.min(lines.length, start + 119);
    return { ok: true, data: { file, content: lines.slice(start - 1, end).join("\n"), startLine: start, endLine: end, totalLines: lines.length, hash, freshness, anchorLine: freshness === "matches" ? anchor : null } };
  } catch { return fail("SOURCE_UNAVAILABLE", "The source file is unavailable or cannot be read."); }
  finally { if (fd !== undefined) closeSync(fd); }
}

export async function getSourceExcerpt(workspaceId: string, input: { analysisId: string; targetId: string; anchorLine?: number }): Promise<ServiceResult<SourceExcerpt>> {
  const [ws, snapshot] = await Promise.all([getWorkspaceById(workspaceId), getPathwaySnapshot(workspaceId)]);
  if (!ws.ok) return ws;
  if (!snapshot.ok) return snapshot;
  if (snapshot.data.analysisId !== input.analysisId) return { ok: false, code: "ANALYSIS_CHANGED", error: "Analysis changed. Reload the Learning Map." };
  const target = snapshot.data.files.find(f => f.id === input.targetId);
  if (!target || !ws.data.sourcePath) return { ok: false, code: "NOT_FOUND", error: "This source target is unavailable." };
  return readConfinedSource(ws.data.sourcePath, target.file, target.hash, input.anchorLine);
}
