/**
 * NirmiqCodeSensei — Project Analyzer Service
 *
 * Shared analysis logic used by both:
 *   - The web UI (app/(app)/workspaces/import)
 *   - The MCP tool (ncs_analyze_project)
 *
 * Reads a local project directory, calls Claude API to generate a complete
 * understanding breakdown, and auto-populates a NirmiqCodeSensei workspace.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { readdirSync, readFileSync, existsSync, mkdirSync, realpathSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";
import os from "os";
import {
  createWorkspace,
  listWorkspaces,
  getWorkspaceById,
  recomputeWorkspaceProgress,
} from "@/lib/services/workspace.service";
import { createQuestion } from "@/lib/services/explain-back.service";
import {
  createConceptLinkWithSource,
} from "@/lib/services/concept-link.service";
import {
  getLearningMapByWorkspaceId,
  MODULE_KEYS,
  moduleKeyForTitle,
} from "@/lib/services/learning-map.service";
import { detectStack, generateLocalAnalysisText } from "@/lib/services/local-analyzer.service";
import {
  analyzeCode,
  buildFeatureTraces,
  computeSourceFingerprint,
} from "@/lib/services/code-analyzer.service";
import type { SearchChunkInput } from "@/lib/services/search.service";
import { readModuleAliases } from "@/lib/pathways/static-calls";
import { ANALYZER_VERSION, buildSnapshot, normalizeSnapshot } from "@/lib/pathways/snapshot";
import {
  computeSeniorReview,
  enrichReviewWithAI,
} from "@/lib/services/senior-review.service";
import type { ServiceResult } from "@/lib/types";
import { db } from "@/lib/db/client";
import {
  explainBackQuestions,
  conceptLinks,
  learningMaps,
  searchChunks,
  workspaces,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ── Constants ──────────────────────────────────────────────────────────────────

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out",
  ".turbo", ".cache", "coverage", "__pycache__", ".venv",
  "venv", ".env", "vendor", "target", "bin", "obj", ".svn",
]);

const KEY_FILES = [
  "package.json", "requirements.txt", "go.mod", "Cargo.toml",
  "pyproject.toml", "pom.xml", "build.gradle",
  "README.md", "readme.md", "README.txt",
  "index.ts", "index.js", "main.ts", "main.py", "app.py",
  "server.ts", "server.js", "app.ts", "app.js",
  "next.config.ts", "next.config.js", "vite.config.ts",
];

// The repo name becomes a directory under IMPORTED_PROJECTS_DIR, so a "." or
// ".." segment would escape it (path.join(root, "..") is the *parent*), and a
// stale clone there could then be `git pull`-ed. GitHub itself rejects these as
// owner/repo names, so refusing them costs nothing and closes the traversal.
const isSafeSegment = (s: string): boolean => s !== "." && s !== "..";

// Recognise the GitHub URL forms people actually paste — trailing slash,
// /tree/<branch>, /blob/..., ?query, #hash, www., optional .git, and the SSH
// form — and reduce them to the canonical clone URL. Returns null for anything
// that isn't a github.com repo URL. HTTPS-only, github.com-only: the security
// constraint (no other hosts, no shell) is preserved.
export function normalizeGitHubUrl(input: string): string | null {
  const trimmed = input.trim();
  const m =
    /^git@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(trimmed) ??
    /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i.exec(
      trimmed
    );
  if (!m) return null;
  const [, owner, repo] = m;
  if (!isSafeSegment(owner) || !isSafeSegment(repo)) return null;
  return `https://github.com/${owner}/${repo}`;
}

// Block OS system directories AND per-user credential stores, so an imported
// project can never trick the analyzer into reading secrets or system files.
const HOME = os.homedir();
const BLOCKED_PATH_PREFIXES = [
  "/etc", "/sys", "/proc", "/usr", "/bin", "/sbin", "/boot", "/dev", "/lib", "/root",
  "/System", "/Library", "/private/etc",
  "C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)", "C:\\ProgramData",
  // Per-user credential / key stores (any OS). A blocklist can never be
  // exhaustive for a "point me at any folder" feature — the real containment is
  // isInsideRoot() on every read — but these are the stores worth naming.
  path.join(HOME, ".ssh"), path.join(HOME, ".aws"), path.join(HOME, ".gnupg"),
  path.join(HOME, ".kube"), path.join(HOME, ".docker"), path.join(HOME, ".config", "gcloud"),
  path.join(HOME, ".azure"), path.join(HOME, ".config", "gh"),
  path.join(HOME, ".netrc"), path.join(HOME, ".npmrc"), path.join(HOME, ".git-credentials"),
].map((p) => path.normalize(p).toLowerCase());

// Resolve symlinks first so a link pointing at a blocked dir can't slip through,
// then match on a full path-segment boundary (so "/lib" never matches "/library").
function isSystemPath(p: string): boolean {
  let resolved = p;
  try {
    resolved = realpathSync(p);
  } catch {
    /* not on disk yet — fall back to the literal path */
  }
  const normalized = path.normalize(resolved).toLowerCase();
  return BLOCKED_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix + path.sep)
  );
}

export const IMPORTED_PROJECTS_DIR = path.resolve(
  process.cwd(),
  "data",
  "imported-projects"
);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AnalyzeProjectOptions {
  projectPath: string;
  workspaceName?: string;
  /** Optional — if omitted, local heuristic analysis is used (no API call). */
  anthropicApiKey?: string;
}

export interface AnalysisResult {
  workspaceId: string;
  workspaceName: string;
  analysis: string;
  questionsCreated: number;
  conceptsCreated: number;
  /** True when reanalyze short-circuited because the source was unchanged (MS4). */
  unchanged?: boolean;
}

// Structured-output schema for AI analysis. Passed to messages.parse() via
// zodOutputFormat so the model returns typed JSON the code persists directly —
// no fragile regex parsing of prose (the old failure mode).
const AnalysisSchema = z.object({
  whatItDoes: z.string(),
  techStack: z.array(z.object({ tech: z.string(), role: z.string() })),
  howItWorks: z.string(),
  keyFiles: z.array(z.object({ file: z.string(), role: z.string() })),
  understandAreas: z.array(z.string()),
  questions: z.array(
    z.object({
      difficulty: z.enum(["beginner", "intermediate", "advanced"]),
      question: z.string(),
    })
  ),
  concepts: z.array(
    z.object({ name: z.string(), type: z.string(), explanation: z.string() })
  ),
  risks: z.array(z.string()),
});

type ParsedAnalysis = z.infer<typeof AnalysisSchema>;

// ── File helpers ───────────────────────────────────────────────────────────────

/**
 * True only when `candidate` resolves — through every symlink and Windows
 * directory junction — to something inside `root`.
 *
 * code-analyzer's walk skips symlinked dirents, but the two prompt-building
 * helpers below read paths directly, so without this a directory named `lib`
 * that is really a junction to an unrelated project would be read and, when an
 * API key is set, sent verbatim to the model. Junctions need no privilege to
 * create on Windows, so a plain local-folder import is enough to trigger it.
 * This restores the confinement SECURITY.md documents (SEC-008).
 */
function isInsideRoot(candidate: string, root: string): boolean {
  try {
    const realRoot = realpathSync(root);
    const real = realpathSync(candidate);
    return real === realRoot || real.startsWith(realRoot + path.sep);
  } catch {
    return false;
  }
}

function getFileTree(dir: string, depth = 0, maxDepth = 3, root = dir): string[] {
  if (depth > maxDepth) return [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const lines: string[] = [];
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      const indent = "  ".repeat(depth);
      if (entry.isDirectory()) {
        if (!isInsideRoot(full, root)) continue;
        lines.push(`${indent}${entry.name}/`);
        lines.push(...getFileTree(full, depth + 1, maxDepth, root));
      } else {
        lines.push(`${indent}${entry.name}`);
      }
    }
    return lines;
  } catch {
    return [];
  }
}

function readKeyFiles(projectPath: string): string {
  const sections: string[] = [];

  for (const fileName of KEY_FILES) {
    const filePath = path.join(projectPath, fileName);
    if (!existsSync(filePath)) continue;
    // A symlinked package.json/README could otherwise pull in a file from
    // anywhere on disk — and this content goes straight into the AI prompt.
    if (!isInsideRoot(filePath, projectPath)) continue;
    try {
      const content = readFileSync(filePath, "utf-8").slice(0, 3000);
      sections.push(`### ${fileName}\n\`\`\`\n${content}\n\`\`\``);
    } catch { /* skip */ }
  }

  // Also pick up a few source files
  const srcDirs = ["src", "app", "lib", "server", "api", "pages"];
  for (const srcDir of srcDirs) {
    const srcPath = path.join(projectPath, srcDir);
    if (!existsSync(srcPath)) continue;
    // A `src`/`lib`/`app` directory that is really a symlink or Windows
    // junction would hand us another project's source tree.
    if (!isInsideRoot(srcPath, projectPath)) continue;
    try {
      const entries = readdirSync(srcPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!/\.(ts|tsx|js|jsx|py|go|rs|java|cs)$/.test(entry.name)) continue;
        if (!isInsideRoot(path.join(srcPath, entry.name), projectPath)) continue;
        try {
          const content = readFileSync(
            path.join(srcPath, entry.name), "utf-8"
          ).slice(0, 2000);
          sections.push(`### ${srcDir}/${entry.name}\n\`\`\`\n${content}\n\`\`\``);
          if (sections.length >= 14) return sections.join("\n\n");
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  return sections.join("\n\n");
}

// ── GitHub cloning ─────────────────────────────────────────────────────────────

export function resolveProjectPath(input: string): {
  localPath: string;
  repoName: string;
  isGitHub: boolean;
  githubUrl?: string;
} {
  const trimmed = input.trim();

  const githubUrl = normalizeGitHubUrl(trimmed);
  if (githubUrl) {
    const repoName = githubUrl.split("/").pop()!;
    const localPath = path.join(IMPORTED_PROJECTS_DIR, repoName);
    return { localPath, repoName, isGitHub: true, githubUrl };
  }

  // Local path
  const repoName = path.basename(trimmed);
  return { localPath: path.resolve(trimmed), repoName, isGitHub: false };
}

// Fail with an actionable message when git is missing (e.g. a published npx
// install on a machine without git) instead of a cryptic ENOENT from execFile.
function assertGitAvailable(): void {
  try {
    execFileSync("git", ["--version"], { stdio: "pipe", timeout: 10_000 });
  } catch {
    throw new Error(
      "GitHub import needs git installed and on your PATH. Install git, or import a local folder path instead."
    );
  }
}

export function cloneOrPullRepo(githubUrl: string, destPath: string): void {
  const url = normalizeGitHubUrl(githubUrl);
  if (!url) {
    throw new Error(
      "Invalid GitHub URL. Use a github.com repository URL, e.g. https://github.com/owner/repo."
    );
  }
  assertGitAvailable();

  mkdirSync(path.dirname(destPath), { recursive: true });

  if (existsSync(path.join(destPath, ".git"))) {
    // Repo already cloned — pull latest. execFileSync (no shell) so nothing in
    // the path can be interpreted as a shell command.
    execFileSync("git", ["pull", "--ff-only"], {
      cwd: destPath,
      timeout: 30_000,
      stdio: "pipe",
    });
  } else {
    // "--" terminates option parsing so a crafted URL can't inject git flags.
    // --depth 1: shallow clone — faster, and no full history to trace into a bundle.
    execFileSync("git", ["clone", "--depth", "1", "--", url, destPath], {
      timeout: 120_000,
      stdio: "pipe",
    });
  }
}

// Classify an explain-back question into one of the four learning-map modules
// (#27/#28) so the flat question list groups under modules. Deterministic keyword
// heuristic — works on both the AI and the offline-heuristic paths. Defaults to
// "how-it-works" (the main conceptual bucket).
function inferQuestionModuleKey(text: string): string {
  const t = text.toLowerCase();
  if (/\b(break|fail|crash|error|bug|risk|edge case|go wrong|vulnerab|secur|scale)\b/.test(t))
    return MODULE_KEYS.riskMap;
  if (/\b(file|folder|directory|structure|entry point|where is|which file|organi[sz])\b/.test(t))
    return MODULE_KEYS.keyFiles;
  if (/\b(stack|dependenc|library|framework|package|version|install|tooling|why .* chosen)\b/.test(t))
    return MODULE_KEYS.techStack;
  return MODULE_KEYS.howItWorks;
}

// ── Analysis section parsing ───────────────────────────────────────────────────

function extractSection(text: string, header: string): string {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\*\\*${escaped}[^*]*\\*\\*`);
  const m = text.match(re);
  if (!m || m.index === undefined) return "";
  const after = text.slice(m.index + m[0].length);
  const nextIdx = after.search(/\n\n\*\*[A-Z]/);
  return (nextIdx === -1 ? after : after.slice(0, nextIdx)).trim();
}

function parseUnderstandAreas(text: string): string[] {
  const section = extractSection(text, "WHAT YOU NEED TO UNDERSTAND");
  const results: string[] = [];
  for (const line of section.split("\n")) {
    const m = line.match(/^\d+\.\s+(.+)$/);
    if (m) results.push(m[1].trim());
  }
  return results.slice(0, 5);
}

function parseConceptNames(text: string): string[] {
  const section = extractSection(text, "5 KEY CS CONCEPTS");
  const names: string[] = [];
  const re = /- (.+?)\s*\(([^()]+)\):/g;
  let m;
  while ((m = re.exec(section)) !== null) names.push(m[1].trim());
  return names.slice(0, 8);
}

/** Render a structured analysis back into the readable markdown stored as analysisRaw. */
function renderAnalysisMarkdown(a: ParsedAnalysis): string {
  return [
    "**WHAT THIS PROJECT DOES**",
    a.whatItDoes,
    "",
    "**TECH STACK**",
    ...a.techStack.map((t) => `- ${t.tech}: ${t.role}`),
    "",
    "**HOW IT WORKS**",
    a.howItWorks,
    "",
    "**KEY FILES AND WHAT THEY DO**",
    ...a.keyFiles.map((f) => `- ${f.file}: ${f.role}`),
    "",
    "**WHAT YOU NEED TO UNDERSTAND**",
    ...a.understandAreas.map((x, i) => `${i + 1}. ${x}`),
    "",
    "**10 EXPLAIN-BACK QUESTIONS**",
    ...a.questions.map((q, i) => `Q${i + 1} (${q.difficulty}): ${q.question}`),
    "",
    "**5 KEY CS CONCEPTS IN THIS PROJECT**",
    ...a.concepts.map((c) => `- ${c.name} (${c.type}): ${c.explanation}`),
    "",
    "**WHAT COULD BREAK AND WHY**",
    ...a.risks.map((r) => `- ${r}`),
  ].join("\n");
}

function buildLearningMapContent(
  analysisText: string,
  projectName: string,
  structured?: ParsedAnalysis | null
) {
  const whatItDoes = structured
    ? structured.whatItDoes
    : extractSection(analysisText, "WHAT THIS PROJECT DOES");
  const techStack = structured
    ? structured.techStack.map((t) => `- ${t.tech}: ${t.role}`).join("\n")
    : extractSection(analysisText, "TECH STACK");
  const howItWorks = structured
    ? structured.howItWorks
    : extractSection(analysisText, "HOW IT WORKS");
  const keyFiles = structured
    ? structured.keyFiles.map((f) => `- ${f.file}: ${f.role}`).join("\n")
    : extractSection(analysisText, "KEY FILES AND WHAT THEY DO");
  const riskMap = structured
    ? structured.risks.map((r) => `- ${r}`).join("\n")
    : extractSection(analysisText, "WHAT COULD BREAK AND WHY");
  const conceptNames = structured
    ? structured.concepts.map((c) => c.name)
    : parseConceptNames(analysisText);

  const modules: Array<{
    title: string;
    summary: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    concepts?: string[];
  }> = [];

  if (techStack)  modules.push({ title: "Tech Stack & Dependencies", summary: techStack,  difficulty: "beginner" });
  // Attach the CS concepts to the architecture module so they surface as chips
  if (howItWorks) modules.push({ title: "How It Works",              summary: howItWorks, difficulty: "intermediate", concepts: conceptNames });
  if (keyFiles)   modules.push({ title: "Key Files",                 summary: keyFiles,   difficulty: "beginner" });
  if (riskMap)    modules.push({ title: "Risk Map — What Could Break", summary: riskMap,  difficulty: "advanced" });

  const checkpoints = structured
    ? structured.understandAreas.slice(0, 5)
    : parseUnderstandAreas(analysisText);

  return {
    title: `${projectName} — Project Analysis`,
    summary: whatItDoes || undefined,
    analysisRaw: analysisText,
    modules,
    checkpoints,
  };
}

// ── Main analysis ──────────────────────────────────────────────────────────────

export async function analyzeProject(
  options: AnalyzeProjectOptions
): Promise<ServiceResult<AnalysisResult>> {
  const { projectPath, anthropicApiKey } = options;

  if (!existsSync(projectPath)) {
    return { ok: false, error: `Project folder not found: ${projectPath}` };
  }

  const resolvedPath = path.resolve(projectPath);

  if (isSystemPath(resolvedPath)) {
    return {
      ok: false,
      error: `Import blocked: "${resolvedPath}" is a system directory. Choose a project folder inside your home or workspace directory.`,
    };
  }
  const projectName = options.workspaceName ?? path.basename(resolvedPath);

  // H4 — idempotent re-import guard. If this exact path is already imported into
  // a non-archived workspace, don't silently create a duplicate. Tell the user
  // to delete the existing one first (deletion now exists — see deleteWorkspace).
  // Checked before any analysis so a duplicate never costs an API call.
  // Match on the canonical sourcePath column; fall back to the legacy
  // "Imported from: <path>" description marker for workspaces created before the
  // sourcePath migration (their sourcePath is null).
  const importMarker = `Imported from: ${resolvedPath}`;
  const existing = await listWorkspaces();
  if (existing.ok) {
    const dup = existing.data.find(
      (w) =>
        w.status !== "archived" &&
        (w.sourcePath === resolvedPath ||
          (w.sourcePath == null && w.description === importMarker))
    );
    if (dup) {
      return {
        ok: false,
        error: `"${dup.title}" was already imported from this path. Delete that workspace first if you want to re-import it fresh.`,
      };
    }
  }

  // Compute the analysis (AI structured output, or local heuristic fallback).
  const computed = await computeAnalysis(resolvedPath, projectName, anthropicApiKey);
  if (!computed.ok) return computed;
  const { analysisText, structured } = computed.data;

  // Create workspace
  const wsResult = await createWorkspace({
    title: projectName,
    type: "project",
    goal: `Understand everything about ${projectName} — how it works, why it was built this way, and how to extend or debug it.`,
    // description keeps the human-readable "Imported from:" label; sourcePath is
    // the canonical machine-read field (H4 dedup + reanalyze both read it).
    description: `Imported from: ${resolvedPath}`,
    sourcePath: resolvedPath,
  });

  if (!wsResult.ok) {
    return { ok: false, error: `Could not create workspace: ${wsResult.error}` };
  }

  const workspaceId = wsResult.data.id;
  let questionsCreated: number, conceptsCreated: number;
  try {
    ({ questionsCreated, conceptsCreated } = await persistAnalysis(
      workspaceId, resolvedPath, projectName, analysisText, structured, anthropicApiKey
    ));
  } catch {
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    return { ok: false, error: "The analysis could not be saved. No partial workspace was retained.", code: "DB_ERROR" };
  }

  return {
    ok: true,
    data: {
      workspaceId,
      workspaceName: projectName,
      analysis: analysisText,
      questionsCreated,
      conceptsCreated,
    },
  };
}

/**
 * Re-run analysis on a previously imported workspace, replacing its
 * auto-generated learning artifacts (explain-back questions, concept links,
 * learning map, search index) with fresh ones derived from the current state of
 * the source code. User-authored data (debug logs, daily logs, session logs) is
 * left untouched. H4 blocks re-importing the same path, so this is the
 * sanctioned way to refresh a workspace whose code changed after import.
 */
export async function reanalyzeProject(
  workspaceId: string,
  anthropicApiKey?: string
): Promise<ServiceResult<AnalysisResult>> {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws.ok) return ws;

  // Prefer the canonical sourcePath column; fall back to parsing the legacy
  // "Imported from: <path>" description marker for pre-migration workspaces.
  const marker = "Imported from: ";
  const description = ws.data.description ?? "";
  const resolvedPath =
    ws.data.sourcePath ??
    (description.startsWith(marker) ? description.slice(marker.length) : "");
  if (!resolvedPath) {
    return {
      ok: false,
      error:
        "This workspace was not created from an imported project, so there is nothing to refresh.",
    };
  }

  if (!existsSync(resolvedPath)) {
    return {
      ok: false,
      error: `The original project folder no longer exists at "${resolvedPath}".`,
    };
  }
  if (isSystemPath(resolvedPath)) {
    return { ok: false, error: "Refresh blocked: the stored path is a system directory." };
  }

  // GitHub-imported clones live under IMPORTED_PROJECTS_DIR — pull the latest
  // before re-analysing so "Refresh" reflects the current remote code, not the
  // clone from import day. Best-effort: if the pull fails (offline, diverged),
  // we still re-analyse the existing copy. Local-path workspaces are the
  // user's own working tree and are never touched.
  if (
    resolvedPath.startsWith(IMPORTED_PROJECTS_DIR) &&
    existsSync(path.join(resolvedPath, ".git"))
  ) {
    try {
      execFileSync("git", ["pull", "--ff-only"], {
        cwd: resolvedPath,
        timeout: 30_000,
        stdio: "pipe",
      });
    } catch { /* offline or diverged — analyse the existing clone */ }
  }

  const projectName = ws.data.title;

  // MS4 incremental re-analysis — if the source tree is unchanged since the last
  // run (same fingerprint), skip the whole expensive pass and keep the existing
  // artifacts. Near-instant on an unchanged repo; a genuine edit (which changes
  // a file's size or mtime) flips the fingerprint and forces a full refresh.
  const currentFingerprint = computeSourceFingerprint(resolvedPath);
  const existingMap = await getLearningMapByWorkspaceId(workspaceId);
  if (
    existingMap.ok &&
    existingMap.data?.sourceFingerprint &&
    currentFingerprint &&
    existingMap.data.sourceFingerprint === currentFingerprint &&
    normalizeSnapshot(existingMap.data.featureTracesJson, existingMap.data.id).analyzerVersion === ANALYZER_VERSION
  ) {
    if (!ws.data.sourcePath) await db.update(workspaces).set({ sourcePath: resolvedPath }).where(eq(workspaces.id, workspaceId));
    return {
      ok: true,
      data: {
        workspaceId,
        workspaceName: projectName,
        analysis: existingMap.data.analysisRaw ?? "",
        questionsCreated: 0,
        conceptsCreated: 0,
        unchanged: true,
      },
    };
  }

  // Compute fresh analysis BEFORE deleting anything, so a failed re-analysis
  // never wipes the existing content.
  const computed = await computeAnalysis(resolvedPath, projectName, anthropicApiKey);
  if (!computed.ok) return computed;

  let questionsCreated: number, conceptsCreated: number;
  try {
    ({ questionsCreated, conceptsCreated } = await persistAnalysis(
      workspaceId, resolvedPath, projectName, computed.data.analysisText,
      computed.data.structured, anthropicApiKey, true
    ));
  } catch {
    return { ok: false, error: "Refresh could not be saved. The previous analysis is still available.", code: "DB_ERROR" };
  }
  // Progress is derived from answered questions + completed checkpoints, so
  // without this the workspace keeps its pre-refresh percentage against a
  // freshly generated question set.
  await recomputeWorkspaceProgress(workspaceId);

  return {
    ok: true,
    data: {
      workspaceId,
      workspaceName: projectName,
      analysis: computed.data.analysisText,
      questionsCreated,
      conceptsCreated,
    },
  };
}

/**
 * Compute the project analysis: structured AI output when an API key is present
 * (with a local-heuristic fallback if the parse comes back empty), otherwise
 * the local heuristic. Returns the rendered markdown plus the structured object
 * (null when the local path was used). Performs no DB writes.
 */
async function computeAnalysis(
  resolvedPath: string,
  projectName: string,
  anthropicApiKey?: string
): Promise<
  ServiceResult<{ analysisText: string; structured: ParsedAnalysis | null }>
> {
  const fileTree = getFileTree(resolvedPath).join("\n").slice(0, 3000);
  const keyFileContents = readKeyFiles(resolvedPath).slice(0, 8000);

  if (!anthropicApiKey) {
    // ── Local heuristic analysis (no API key needed) ───────────────────────
    const stack = detectStack(resolvedPath, projectName);
    return {
      ok: true,
      data: {
        analysisText: generateLocalAnalysisText(stack, fileTree),
        structured: null,
      },
    };
  }

  // ── AI-powered analysis via Claude API ────────────────────────────────
  const client = new Anthropic({ apiKey: anthropicApiKey });
  let structured: ParsedAnalysis | null = null;
  try {
    const message = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(AnalysisSchema) },
      messages: [
        {
          role: "user",
          content: [
            `## Project: ${projectName}`,
            `## Path: ${resolvedPath}`,
            "",
            "## File tree",
            "```",
            fileTree,
            "```",
            "",
            "## Key files",
            keyFileContents,
            "",
            "You are a senior software engineer and educator analysing this project for",
            "someone who built it with AI coding tools and may not fully understand it.",
            "Write plain English with no unexplained jargon. Be specific to THIS project;",
            "never give generic answers. Fill every field of the required structure:",
            "- whatItDoes: 2-3 plain sentences on the problem it solves.",
            "- techStack: each technology and its role in THIS project.",
            "- howItWorks: 4-6 sentences on how the pieces connect (analogies welcome).",
            "- keyFiles: the most important files and each one's job.",
            "- understandAreas: exactly 5 areas to understand, ordered by importance.",
            "- questions: exactly 10 explain-back questions, progressively harder; use only",
            "  the difficulty values beginner, intermediate, advanced (about 2 / 3 / 5).",
            "- concepts: 5 key CS/DSA concepts and how each appears in THIS codebase.",
            "- risks: 3 specific fragile spots and why each could fail.",
          ].join("\n"),
        },
      ],
    });
    structured = message.parsed_output;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `AI analysis failed: ${msg.slice(0, 200)}` };
  }

  // Count assertion + fallback: if the structured parse came back empty or
  // invalid, degrade to the local heuristic rather than persisting nothing.
  if (structured && structured.questions.length > 0) {
    return {
      ok: true,
      data: { analysisText: renderAnalysisMarkdown(structured), structured },
    };
  }
  const stack = detectStack(resolvedPath, projectName);
  return {
    ok: true,
    data: {
      analysisText: generateLocalAnalysisText(stack, fileTree),
      structured: null,
    },
  };
}

/**
 * Persist an analysis into a workspace: explain-back questions, concept links,
 * code-grounded DSA findings, the architecture graph, the search index, and the
 * learning map. Returns how many questions/concepts were created.
 */
async function persistAnalysis(
  workspaceId: string,
  resolvedPath: string,
  projectName: string,
  analysisText: string,
  structured: ParsedAnalysis | null,
  anthropicApiKey?: string,
  replace = false
): Promise<{ questionsCreated: number; conceptsCreated: number }> {
  const pendingQuestions: Array<Parameters<typeof createQuestion>[1]> = [];
  const pendingConcepts: Array<Parameters<typeof createConceptLinkWithSource>[1]> = [];
  let pendingChunks: SearchChunkInput[] = [];
  const queueQuestion = async (_id: string, value: Parameters<typeof createQuestion>[1]) => { pendingQuestions.push(value); return { ok: true }; };
  const queueConcept = async (_id: string, value: Parameters<typeof createConceptLinkWithSource>[1]) => { pendingConcepts.push(value); return { ok: true }; };
  let questionsCreated = 0;
  let conceptsCreated = 0;

  if (structured) {
    // Persist directly from the typed structured output — no prose parsing.
    for (const q of structured.questions) {
      const r = await queueQuestion(workspaceId, {
        question: q.question,
        difficulty: q.difficulty,
        moduleKey: inferQuestionModuleKey(q.question),
      });
      if (r.ok) questionsCreated++;
    }
    for (const c of structured.concepts) {
      const r = await queueConcept(workspaceId, {
        projectFeature: `${projectName} codebase`,
        conceptName: c.name,
        conceptType: c.type,
        explanation: c.explanation,
        moduleKey: MODULE_KEYS.howItWorks,
      });
      if (r.ok) conceptsCreated++;
    }
  } else {
    // Local fallback path: parse the deterministic template we generated
    // ourselves (not untrusted LLM freeform), so these regexes are safe.
    const qRegex = /Q(\d+)\s*\((beginner|intermediate|advanced|expert)\):\s*(.+)/gi;
    let qMatch;
    while ((qMatch = qRegex.exec(analysisText)) !== null) {
      const raw = qMatch[2].toLowerCase();
      const difficulty = (raw === "expert" ? "advanced" : raw) as
        | "beginner"
        | "intermediate"
        | "advanced";
      const r = await queueQuestion(workspaceId, {
        question: qMatch[3].trim(),
        difficulty,
        moduleKey: inferQuestionModuleKey(qMatch[3].trim()),
      });
      if (r.ok) questionsCreated++;
    }

    const conceptSection = extractSection(analysisText, "5 KEY CS CONCEPTS");
    const cRegex = /- (.+?)\s*\(([^()]+)\):\s*(.+)/g;
    let cMatch;
    while ((cMatch = cRegex.exec(conceptSection)) !== null) {
      const r = await queueConcept(workspaceId, {
        projectFeature: `${projectName} codebase`,
        conceptName: cMatch[1].trim(),
        conceptType: cMatch[2].trim(),
        explanation: cMatch[3].trim(),
        moduleKey: MODULE_KEYS.howItWorks,
      });
      if (r.ok) conceptsCreated++;
    }
  }

  // Read the real source code: extract code-grounded DSA findings + build the
  // architecture/workflow graph. Best-effort — never fail the import over this.
  let graphJson: string | undefined;
  let seniorReviewJson: string | undefined;
  let featureTracesJson: string | undefined;
  let analysisFailure = false;
  let analysisTruncated = false;
  let scannedFileCount = 0;
  try {
    const code = analyzeCode(resolvedPath, projectName);
    analysisTruncated = code.truncated;
    scannedFileCount = code.fileCount;

    for (const f of code.findings) {
      const r = await queueConcept(workspaceId, {
        projectFeature: f.file,
        conceptName: f.name,
        conceptType: f.category,
        explanation: `${f.explanation}\n\nCS fundamental: ${f.dsaConnection}`,
        practiceTask: f.practiceTask,
        sourceFile: `${f.file}:${f.line}`,
        codeSnippet: f.snippet,
        astConfidence: f.confidence,
        moduleKey: MODULE_KEYS.keyFiles,
      });
      if (r.ok) conceptsCreated++;
    }

    // Senior Review — eight local lenses over the already-collected corpus.
    // Zero network by default; the optional AI narrative sends only the
    // computed findings (secrets masked), never the source code.
    const review = computeSeniorReview({
      projectPath: resolvedPath,
      projectTitle: projectName,
      corpus: code.corpus,
      importEdges: code.importEdges,
      graph: code.graph,
      stack: detectStack(resolvedPath, projectName),
    });
    // Hoisted out of the badging block below so feature traces can annotate each
    // hop with the risk that actually sits on it — same maps, two consumers.
    const SEVERITY_RANK = { critical: 3, high: 2, medium: 1 } as const;
    const secByFile = new Map<string, "critical" | "high" | "medium">();
    const complexFiles = new Set<string>();

    if (review.ok) {
      review.data.truncated = code.truncated;
      if (anthropicApiKey) {
        const narrative = await enrichReviewWithAI(
          review.data,
          anthropicApiKey,
          projectName
        );
        if (narrative) review.data.aiNarrative = narrative;
      }
      seniorReviewJson = JSON.stringify(review.data);

      // Badge the graph's file nodes with review findings BEFORE the graph is
      // serialized: security ring (worst severity per file) + complexity ring.
      for (const f of review.data.security.findings) {
        if (!f.file || !(f.severity in SEVERITY_RANK)) continue;
        const sev = f.severity as keyof typeof SEVERITY_RANK;
        const prev = secByFile.get(f.file);
        if (!prev || SEVERITY_RANK[sev] > SEVERITY_RANK[prev]) {
          secByFile.set(f.file, sev);
        }
      }
      for (const c of review.data.codeHealth.complexFunctions) {
        if (c.complexity > 10) complexFiles.add(c.file);
      }
      for (const n of code.graph.nodes) {
        if (n.type !== "file") continue;
        const rel = n.id.slice("file:".length);
        const security = secByFile.get(rel);
        const complex = complexFiles.has(rel);
        if (security || complex) {
          n.flags = {
            ...(security ? { security } : {}),
            ...(complex ? { complex: true } : {}),
          };
        }
      }
    }

    if (code.graph.nodes.length > 1) {
      graphJson = JSON.stringify(code.graph);

      // Feature traces — end-to-end paths through the import graph, each hop
      // carrying the review findings for that file. This is what turns a flat
      // A–F report into "this risk sits on the path your Delete button takes".
      const traces = buildFeatureTraces(code);
      for (const trace of traces) {
        for (const hop of trace.hops) {
          const severity = secByFile.get(hop.file);
          if (severity) hop.risks.push(`security: ${severity}`);
          if (complexFiles.has(hop.file)) hop.risks.push("high complexity");
        }
      }
      featureTracesJson = JSON.stringify(buildSnapshot(code, traces, computeSourceFingerprint(resolvedPath), readModuleAliases(resolvedPath)));
    }

    // BM25 search index — best-effort, never fail the import
    try {
      pendingChunks = code.chunks;
    } catch (e) {
      console.warn("[analyze] search index build failed:", e);
    }
  } catch (e) {
    // Still best-effort — the learning map saves either way. But swallowing this
    // silently hid a missing graph, Deep Review AND DSA bridge behind an import
    // that looked completely normal.
    analysisFailure = true;
    console.warn("[analyze] code-analysis phase failed:", e);
  }

  // Auto-create Learning Map from analysis (+ the real architecture graph). When
  // the project was large enough to hit the file cap, say so honestly in the
  // summary instead of presenting a partial analysis as if it were complete.
  const mapContent = buildLearningMapContent(analysisText, projectName, structured);
  const analysisSummary = analysisTruncated
    ? `${mapContent.summary ? mapContent.summary + "\n\n" : ""}⚠️ Large project — code analysis covered ${scannedFileCount} source files (ranked by importance); some files were not scanned.`
    : mapContent.summary;
  // Fingerprint the source tree so a later reanalyze can skip work when nothing
  // changed (MS4 incremental re-analysis).
  const sourceFingerprint = computeSourceFingerprint(resolvedPath) ?? undefined;
  const mapInput = {
    ...mapContent,
    summary: `${analysisSummary ?? ""}${analysisFailure ? "\n\nSource analysis was unavailable. Graph, walkthrough, or source evidence may be missing; refresh to retry." : ""}`,
    graphJson,
    seniorReviewJson,
    sourceFingerprint,
    featureTracesJson,
  };
  // All filesystem work and optional network enrichment finished before this short transaction.
  db.transaction(tx => {
    if (replace) tx.update(workspaces).set({ sourcePath: resolvedPath }).where(eq(workspaces.id, workspaceId)).run();
    const oldMap = replace ? tx.select().from(learningMaps).where(eq(learningMaps.workspaceId, workspaceId)).get() : undefined;
    const oldQuestions = replace ? tx.select().from(explainBackQuestions).where(eq(explainBackQuestions.workspaceId, workspaceId)).all() : [];
    const oldConcepts = replace ? tx.select().from(conceptLinks).where(eq(conceptLinks.workspaceId, workspaceId)).all() : [];
    if (replace) {
      tx.delete(explainBackQuestions).where(eq(explainBackQuestions.workspaceId, workspaceId)).run();
      tx.delete(conceptLinks).where(eq(conceptLinks.workspaceId, workspaceId)).run();
      tx.delete(searchChunks).where(eq(searchChunks.workspaceId, workspaceId)).run();
      tx.delete(learningMaps).where(eq(learningMaps.workspaceId, workspaceId)).run();
    }
    const key = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
    const used = new Set<string>();
    for (const q of pendingQuestions) {
      const old = oldQuestions.find(o => key(o.question) === key(q.question));
      if (old) used.add(old.id);
      tx.insert(explainBackQuestions).values({ ...q, workspaceId, expectedPointsJson: q.expectedPoints ? JSON.stringify(q.expectedPoints.split("\n").filter(Boolean)) : "[]", userAnswer: old?.userAnswer, score: old?.score, confidence: old?.confidence }).run();
    }
    // Existing rows have no reliable authorship flag: preserve unmatched learner material.
    for (const q of oldQuestions.filter(q => !used.has(q.id))) tx.insert(explainBackQuestions).values({ ...q, learningMapId: null }).run();
    for (const c of pendingConcepts) tx.insert(conceptLinks).values({ ...c, workspaceId }).run();
    for (const c of oldConcepts.filter(c => !pendingConcepts.some(n => n.conceptName === c.conceptName && n.projectFeature === c.projectFeature))) tx.insert(conceptLinks).values(c).run();
    for (const c of pendingChunks) tx.insert(searchChunks).values({ ...c, workspaceId }).run();
    const modules = mapInput.modules.map(m => ({ ...m, id: crypto.randomUUID(), key: moduleKeyForTitle(m.title), concepts: m.concepts ?? [], files: [], confidence: null as string | null }));
    const checkpoints = mapInput.checkpoints.map(question => ({ id: crypto.randomUUID(), question, completed: false }));
    if (oldMap) {
      const oldModules = JSON.parse(oldMap.modulesJson) as Array<typeof modules[number]>;
      for (const m of modules) m.confidence = oldModules.find(o => o.key === m.key)?.confidence ?? null;
      modules.push(...oldModules.filter(o => !modules.some(m => m.key === o.key)));
      const oldCheckpoints = JSON.parse(oldMap.checkpointsJson) as typeof checkpoints;
      for (const c of checkpoints) c.completed = oldCheckpoints.some(o => o.question === c.question && o.completed);
      checkpoints.push(...oldCheckpoints.filter(o => !checkpoints.some(c => c.question === o.question)));
    }
    tx.insert(learningMaps).values({ workspaceId, title: mapInput.title, summary: mapInput.summary, analysisRaw: mapInput.analysisRaw, graphJson, seniorReviewJson, sourceFingerprint, featureTracesJson, modulesJson: JSON.stringify(modules), checkpointsJson: JSON.stringify(checkpoints) }).run();
  });
  return { questionsCreated, conceptsCreated };
}
