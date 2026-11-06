import { generateFlowMarkdown } from "@/lib/services/export.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await generateFlowMarkdown(id);
  if (!result.ok) {
    return new Response(result.error, {
      status: result.code === "NOT_FOUND" ? 404 : 500,
    });
  }
  return new Response(result.data.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.data.filename}"`,
    },
  });
}
