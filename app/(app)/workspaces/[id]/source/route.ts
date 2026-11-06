import { getSourceExcerpt } from "@/lib/services/source-view.service";
import { sameOriginRequest } from "@/lib/utils/request-origin";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOriginRequest(request)) return Response.json({ ok: false, error: "Cross-site source access denied." }, { status: 403 });
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const input = z.object({ analysisId: z.string().min(1).max(100), targetId: z.string().min(1).max(100), anchorLine: z.coerce.number().int().min(1).max(100_000).optional() }).safeParse(query);
  if (!input.success) return Response.json({ ok: false, error: "Invalid source selection." }, { status: 400 });
  const result = await getSourceExcerpt((await context.params).id, input.data);
  return Response.json(result, { status: result.ok ? 200 : result.code === "ANALYSIS_CHANGED" ? 409 : result.code === "FORBIDDEN" ? 403 : 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
