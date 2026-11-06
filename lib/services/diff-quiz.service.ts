import { execFile } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { getWorkspaceById } from "@/lib/services/workspace.service";
import {
  createQuestion,
  getQuestionsByWorkspaceId,
} from "@/lib/services/explain-back.service";
import { BLOCKED_SOURCE_PATH } from "@/lib/services/source-view.service";
import type { ServiceResult } from "@/lib/types";

const run = promisify(execFile);

const CODE_EXT = /\.(tsx?|jsx?|mjs|cjs|mts|cts|py|go|rs|java|rb|php|cs|kt|swift|sql|vue|svelte)$/i;
const SECRET_LINE = /(api[_-]?key|secret|token|passw(or)?d|private[_-]?key)\s*[:=]/i;
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._~^/-]{0,99}$/;
const MAX_FILES = 12;
const MAX_EXCERPT = 12;
const MAX_UNTRACKED_BYTES = 80_000;

export type DiffSymbol = { name: string; params: string[] };
export type DiffFile = {
  path: string;
  added: number;
  removed: number;
  untracked: boolean;
  symbols: DiffSymbol[];
  /** Non-relative modules newly imported. */
  imports: string[];
  /** Count of added throw/catch/except/raise lines. */
  errorHandling: number;
  excerpt: string[];
};
export type DiffContext = {
  /** Human label for what was compared. */
  range: string;
  files: DiffFile[];
  /** True when more files changed than are listed. */
  truncated: boolean;
};

export type DiffQuestion = {
  question: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  expectedPoints: string;
};

// ── Parsing (pure, exported for tests) ──────────────────────────────────────

function paramNames(raw: string): string[] {
  return raw
    .split(",")
    .map((p) => p.trim().replace(/^\.\.\./, "").split(/[:=?]/)[0].trim())
    .filter((p) => /^[A-Za-z_$][\w$]*$/.test(p))
    .slice(0, 4);
}

const SYMBOL_PATTERNS: RegExp[] = [
  /(?:^|\s)(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/,
  /(?:^|\s)(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?\(([^)]*)\)\s*(?::[^=]+)?=>/,
  /(?:^|\s)(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?([A-Za-z_$][\w$]*)\s*=>/,
  /^\s*(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/,
  /^\s*func\s+(?:\([^)]*\)\s*)?(\w+)\s*\(([^)]*)\)/,
  /(?:^|\s)class\s+([A-Za-z_$][\w$]*)()/,
];

export function extractSymbols(lines: string[]): DiffSymbol[] {
  const out: DiffSymbol[] = [];
  for (const line of lines) {
    for (const re of SYMBOL_PATTERNS) {
      const m = re.exec(line);
      if (m && !out.some((s) => s.name === m[1])) {
        out.push({ name: m[1], params: paramNames(m[2] ?? "") });
        break;
      }
    }
  }
  return out;
}

export function extractImports(lines: string[]): string[] {
  const out = new Set<string>();
  for (const line of lines) {
    const m =
      /\bfrom\s+["']([^"']+)["']/.exec(line) ??
      /\brequire\(\s*["']([^"']+)["']\s*\)/.exec(line) ??
      /^\s*import\s+["']([^"']+)["']/.exec(line) ??
      /^\s*(?:from|import)\s+([A-Za-z_][\w.]*)/.exec(line);
    if (m && !m[1].startsWith(".") && !m[1].startsWith("@/")) out.add(m[1]);
  }
  return [...out].slice(0, 5);
}

function describeFile(
  file: string,
  addedLines: string[],
  removed: number,
  untracked: boolean
): DiffFile {
  return {
    path: file,
    added: addedLines.length,
    removed,
    untracked,
    symbols: extractSymbols(addedLines),
    imports: extractImports(addedLines),
    errorHandling: addedLines.filter((l) => /\b(throw|catch|except|raise)\b/.test(l)).length,
    excerpt: addedLines
      .filter((l) => l.trim())
      .slice(0, MAX_EXCERPT)
      .map((l) => (SECRET_LINE.test(l) ? "[redacted]" : l.trimEnd().slice(0, 160))),
  };
}

function allowed(file: string): boolean {
  return CODE_EXT.test(file) && !BLOCKED_SOURCE_PATH.test(file);
}

/** Parse `git diff --unified=0` output into per-file summaries. */
export function parseDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  let current: { file: string; added: string[]; removed: number } | null = null;
  const flush = () => {
    if (current && allowed(current.file))
      files.push(describeFile(current.file, current.added, current.removed, false));
    current = null;
  };
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      flush();
      current = { file: "", added: [], removed: 0 };
    } else if (!current) {
      continue;
    } else if (line.startsWith("+++ ")) {
      const p = line.slice(4);
      if (p !== "/dev/null") current.file = p.replace(/^b\//, "");
    } else if (line.startsWith("--- ")) {
      if (!current.file) current.file = line.slice(4).replace(/^a\//, "");
    } else if (line.startsWith("+")) {
      current.added.push(line.slice(1));
    } else if (line.startsWith("-")) {
      current.removed++;
    }
  }
  flush();
  return files;
}

// ── Reading the working tree ───────────────────────────────────────────────

async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await run(
    "git",
    ["-C", root, "-c", "core.quotepath=false", "-c", "core.fsmonitor=false", ...args],
    {
      maxBuffer: 8 * 1024 * 1024,
      timeout: 15_000,
      windowsHide: true,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    }
  );
  return stdout;
}

/**
 * Summarise what changed in the workspace's source tree: uncommitted work
 * (tracked + new files) or, when the tree is clean, the latest commit.
 * Read-only; nothing is executed from the project and nothing leaves the machine.
 */
export async function getDiffContext(
  workspaceId: string,
  base?: string
): Promise<ServiceResult<DiffContext>> {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws.ok) return ws;
  const root = ws.data.sourcePath;
  if (!root)
    return { ok: false, error: "This workspace has no source folder to diff", code: "NO_SOURCE" };
  if (base !== undefined && !SAFE_REF.test(base))
    return { ok: false, error: "Invalid base ref", code: "BAD_REF" };

  try {
    if (!statSync(root).isDirectory()) throw new Error("not a directory");
    await git(root, ["rev-parse", "--is-inside-work-tree"]);
  } catch {
    return { ok: false, error: "Source folder is missing or not a git repository", code: "NOT_GIT" };
  }

  try {
    const flags = ["diff", "--unified=0", "--no-color", "--no-ext-diff", "--no-textconv", "--relative"];
    let range = base ? `working tree vs ${base}` : "uncommitted changes";
    let files = parseDiff(await git(root, [...flags, base ?? "HEAD", "--"]));

    if (!base) {
      const untracked = (await git(root, ["ls-files", "--others", "--exclude-standard"]))
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f && allowed(f));
      for (const f of untracked) {
        try {
          const abs = path.join(root, f);
          if (statSync(abs).size > MAX_UNTRACKED_BYTES) continue;
          const text = readFileSync(abs, "utf8");
          if (text.includes("\0")) continue;
          files.push(describeFile(f, text.split("\n"), 0, true));
        } catch {
          // unreadable file: skip, never fail the whole summary
        }
      }
      if (files.length === 0) {
        range = "latest commit";
        files = parseDiff(await git(root, [...flags, "HEAD~1", "HEAD", "--"]).catch(() => ""));
      }
    }

    files.sort((a, b) => b.added + b.removed - (a.added + a.removed));
    return {
      ok: true,
      data: { range, files: files.slice(0, MAX_FILES), truncated: files.length > MAX_FILES },
    };
  } catch {
    return { ok: false, error: "Could not read the git diff", code: "GIT_ERROR" };
  }
}

// ── Question generation (deterministic, offline) ───────────────────────────

const q = (s: string) => `\`${s}\``;

export function buildDiffQuestions(ctx: DiffContext, max = 5): DiffQuestion[] {
  const out: DiffQuestion[] = [];
  for (const f of ctx.files) {
    if (out.length >= max - 1) break;
    const sym = f.symbols[0];
    if (sym) {
      const sig = `${sym.name}(${sym.params.join(", ")})`;
      out.push({
        question: `In ${q(f.path)}, ${q(sym.name)} was added. What does it do, what does it take in, and what would stop working if it were removed?`,
        difficulty: "intermediate",
        expectedPoints: [`${sig} — what it computes or changes`, `which code calls or depends on ${sym.name}`].join("\n"),
      });
    } else if (f.imports.length) {
      out.push({
        question: `${q(f.path)} now depends on ${f.imports.map(q).join(", ")}. Why is that dependency needed, and what could replace it?`,
        difficulty: "intermediate",
        expectedPoints: f.imports.map((i) => `what ${i} provides here`).join("\n"),
      });
    } else if (f.errorHandling > 0) {
      out.push({
        question: `What new failure case does ${q(f.path)} handle, and what does the caller see when it triggers?`,
        difficulty: "intermediate",
        expectedPoints: `the failure case handled in ${path.basename(f.path)}\nwhat the caller receives`,
      });
    } else if (f.removed > 0 && f.added === 0) {
      out.push({
        question: `Lines were removed from ${q(f.path)}. What behaviour disappears, and why was it safe to remove?`,
        difficulty: "advanced",
        expectedPoints: `behaviour removed from ${path.basename(f.path)}\nwhy nothing else relied on it`,
      });
    } else {
      out.push({
        question: `${q(f.path)} changed (+${f.added}/-${f.removed}). Summarise what changed and why, in your own words.`,
        difficulty: "beginner",
        expectedPoints: `what changed in ${path.basename(f.path)}\nwhy the change was needed`,
      });
    }
  }
  if (ctx.files.length >= 2 && out.length < max) {
    const names = ctx.files.slice(0, 3).map((f) => path.basename(f.path));
    out.push({
      question: `This change touches ${ctx.files.length} files (${names.join(", ")}). Walk through how they work together.`,
      difficulty: "advanced",
      expectedPoints: names.map((n) => `role of ${n}`).join("\n"),
    });
  }
  return out;
}

/** Create explain-back questions from the latest changes; skips ones already asked. */
export async function createDiffQuiz(
  workspaceId: string,
  base?: string
): Promise<ServiceResult<{ created: number; skipped: number; files: number; range: string }>> {
  const ctx = await getDiffContext(workspaceId, base);
  if (!ctx.ok) return ctx;
  const existing = await getQuestionsByWorkspaceId(workspaceId);
  if (!existing.ok) return existing;
  const seen = new Set(existing.data.map((e) => e.question));

  let created = 0;
  let skipped = 0;
  for (const d of buildDiffQuestions(ctx.data)) {
    if (seen.has(d.question)) {
      skipped++;
      continue;
    }
    const r = await createQuestion(workspaceId, { ...d, origin: "diff" });
    if (r.ok) created++;
  }
  return {
    ok: true,
    data: { created, skipped, files: ctx.data.files.length, range: ctx.data.range },
  };
}

/** Plain-text rendering for MCP clients, so the agent can write sharper questions. */
export function formatDiffContext(ctx: DiffContext): string {
  if (ctx.files.length === 0) return `No source changes found (${ctx.range}).`;
  const lines = [`Changes (${ctx.range}) — ${ctx.files.length} file(s)${ctx.truncated ? ", truncated" : ""}:`];
  for (const f of ctx.files) {
    lines.push(
      "",
      `• ${f.path}  +${f.added}/-${f.removed}${f.untracked ? "  (new, untracked)" : ""}`
    );
    if (f.symbols.length)
      lines.push(`  new symbols: ${f.symbols.map((s) => `${s.name}(${s.params.join(", ")})`).join(", ")}`);
    if (f.imports.length) lines.push(`  new dependencies: ${f.imports.join(", ")}`);
    if (f.errorHandling) lines.push(`  error handling lines added: ${f.errorHandling}`);
    for (const l of f.excerpt.slice(0, 6)) lines.push(`  + ${l}`);
  }
  return lines.join("\n");
}
