import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pathwayAttempts, pathwayReviews } from "@/lib/db/schema";
import { RUBRIC, RUBRIC_VERSION, assessRubric, selectCallBranches } from "@/lib/pathways/shared";
import { getPathwaySnapshot } from "./pathway.service";
import { getSourceExcerpt } from "./source-view.service";
import { readConfinedSource } from "./source-view.service";
import { getWorkspaceById } from "./workspace.service";
import type { ServiceResult } from "@/lib/types";

const inputSchema = z.object({ analysisId: z.string().min(1).max(100), pathId: z.string().min(1).max(100), choices: z.record(z.string().max(200), z.string().max(100)).default({}) });
const attemptSchema = inputSchema.extend({ answer: z.string().trim().min(1, "Write your explanation first.").max(5000), scores: z.array(z.number().int().min(0).max(2)).length(5) });

export async function getPathwayLearning(workspaceId: string) {
  try {
    const reviews = await db.select().from(pathwayReviews).where(eq(pathwayReviews.workspaceId, workspaceId));
    const attempts = await db.select().from(pathwayAttempts).where(eq(pathwayAttempts.workspaceId, workspaceId)).orderBy(desc(pathwayAttempts.createdAt));
    const [snapshot, ws] = await Promise.all([getPathwaySnapshot(workspaceId), getWorkspaceById(workspaceId)]);
    const validTargets: string[] = [];
    if (snapshot.ok && ws.ok && ws.data.sourcePath) {
      const used = new Set(snapshot.data.paths.flatMap(p => p.hops.map(h => h.targetId)));
      for (const file of snapshot.data.files.filter(f => used.has(f.id) && f.hash)) {
        const result = readConfinedSource(ws.data.sourcePath, file.file, file.hash);
        if (result.ok && result.data.freshness === "matches") validTargets.push(file.id);
      }
    }
    return { ok: true as const, data: { reviews, attempts, validTargets } };
  } catch { return { ok: false as const, error: "Unable to read pathway history.", code: "DB_ERROR" }; }
}

async function resolvePath(workspaceId: string, raw: unknown) {
  const input = inputSchema.safeParse(raw);
  if (!input.success) return { ok: false as const, error: "Invalid walkthrough selection.", code: "INVALID_INPUT" };
  const snapshot = await getPathwaySnapshot(workspaceId);
  if (!snapshot.ok) return snapshot;
  if (snapshot.data.analysisId !== input.data.analysisId) return { ok: false as const, error: "Analysis changed. Reload before saving.", code: "ANALYSIS_CHANGED" };
  const base = snapshot.data.paths.find(p => p.id === input.data.pathId);
  if (!base) return { ok: false as const, error: "Walkthrough not found.", code: "NOT_FOUND" };
  return { ok: true as const, data: { snapshot: snapshot.data, path: selectCallBranches(snapshot.data, base, input.data.choices) } };
}

export async function reviewPathwayStep(workspaceId: string, raw: unknown): Promise<ServiceResult<true>> {
  const resolved = await resolvePath(workspaceId, raw);
  if (!resolved.ok) return resolved;
  const selection = z.object({ stepId: z.string() }).safeParse(raw);
  const hop = selection.success ? resolved.data.path.hops.find(h => h.id === selection.data.stepId) : undefined;
  if (!hop) return { ok: false, error: "Step not found.", code: "NOT_FOUND" };
  const file = resolved.data.snapshot.files.find(f => f.id === hop.targetId)!;
  const source = await getSourceExcerpt(workspaceId, { analysisId: resolved.data.snapshot.analysisId, targetId: file.id });
  if (!source.ok || source.data.freshness !== "matches") return { ok: false, error: "Review requires source matching a current analysis. Re-analyze the project first.", code: "SOURCE_CHANGED" };
  const latest = await getPathwaySnapshot(workspaceId);
  if (!latest.ok || latest.data.analysisId !== resolved.data.snapshot.analysisId) return { ok: false, error: "Analysis changed. Reload before saving.", code: "ANALYSIS_CHANGED" };
  try {
    await db.insert(pathwayReviews).values({ workspaceId, targetKey: hop.id, contentVersion: file.hash! }).onConflictDoNothing();
    return { ok: true, data: true };
  } catch { return { ok: false, error: "Unable to save review.", code: "DB_ERROR" }; }
}

export async function submitPathwayAttempt(workspaceId: string, raw: unknown): Promise<ServiceResult<{ ready: boolean; score: number }>> {
  const parsed = attemptSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid assessment.", code: "INVALID_INPUT" };
  const resolved = await resolvePath(workspaceId, parsed.data);
  if (!resolved.ok) return resolved;
  const { snapshot, path } = resolved.data;
  const sources = await Promise.all([...new Set(path.hops.map(h => h.targetId))].map(targetId => getSourceExcerpt(workspaceId, { analysisId: snapshot.analysisId, targetId })));
  const sourceMatches = sources.every(s => s.ok && s.data.freshness === "matches");
  const latest = await getPathwaySnapshot(workspaceId);
  if (!latest.ok || latest.data.analysisId !== snapshot.analysisId) return { ok: false, error: "Analysis changed. Reload before saving.", code: "ANALYSIS_CHANGED" };
  const result = assessRubric(parsed.data.scores);
  try {
    // Immutable attempts retain prompts, references and hashes, without copying raw source.
    await db.insert(pathwayAttempts).values({ workspaceId, pathwayKey: path.key, contentVersion: path.contentVersion, snapshotJson: JSON.stringify({ analysisId: snapshot.analysisId, path, files: snapshot.files.filter(f => path.hops.some(h => h.targetId === f.id)), sourceMatches }), answer: parsed.data.answer, rubricJson: JSON.stringify({ version: RUBRIC_VERSION, criteria: RUBRIC }), scoresJson: JSON.stringify(parsed.data.scores), score: result.score, ready: result.ready && sourceMatches });
    return { ok: true, data: { score: result.score, ready: result.ready && sourceMatches } };
  } catch { return { ok: false, error: "Unable to save your explanation.", code: "DB_ERROR" }; }
}
