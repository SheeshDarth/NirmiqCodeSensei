import { z } from "zod";
import { sameOriginRequest } from "@/lib/utils/request-origin";
import { getWorkspaceById } from "@/lib/services/workspace.service";
import { getPathwayLearning, reviewPathwayStep, submitPathwayAttempt } from "@/lib/services/pathway-learning.service";
import { getStudyPath, syncStudySuggestions, saveStudyNode, saveStudyEdge, deleteStudyNode } from "@/lib/services/study-path.service";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOriginRequest(request)) return Response.json({ ok: false, error: "Cross-site access denied." }, { status: 403 });
  const { id } = await context.params;
  const ws = await getWorkspaceById(id);
  if (!ws.ok) return Response.json(ws, { status: 404 });
  const [learning, study] = await Promise.all([getPathwayLearning(id), getStudyPath(id)]);
  if (!learning.ok || !study.ok) return Response.json({ ok: false, error: "Unable to load learning records." }, { status: 500 });
  return Response.json({ ok: true, data: { ...learning.data, study: study.data } }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOriginRequest(request)) return Response.json({ ok: false, error: "Cross-site writes denied." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 32_000) return Response.json({ ok: false, error: "Request too large." }, { status: 413 });
  const { id } = await context.params;
  if (!(await getWorkspaceById(id)).ok) return Response.json({ ok: false, error: "Workspace not found." }, { status: 404 });
  let value: unknown;
  try { const text = await request.text(); if (text.length > 32_000) throw new Error(); value = JSON.parse(text); }
  catch { return Response.json({ ok: false, error: "Invalid request." }, { status: 400 }); }
  const parsed = z.object({ action: z.enum(["review", "attempt", "study_sync", "study_node", "study_edge", "study_delete"]), data: z.unknown() }).safeParse(value);
  if (!parsed.success) return Response.json({ ok: false, error: "Unknown action." }, { status: 400 });
  const { action, data } = parsed.data;
  const result = action === "review" ? await reviewPathwayStep(id, data)
    : action === "attempt" ? await submitPathwayAttempt(id, data)
    : action === "study_sync" ? await syncStudySuggestions(id)
    : action === "study_node" ? await saveStudyNode(id, data)
    : action === "study_edge" ? await saveStudyEdge(id, data)
    : await deleteStudyNode(id, z.object({ id: z.string() }).safeParse(data).data?.id ?? "");
  return Response.json(result, { status: result.ok ? 200 : result.code === "ANALYSIS_CHANGED" ? 409 : 400, headers: { "Cache-Control": "no-store" } });
}
