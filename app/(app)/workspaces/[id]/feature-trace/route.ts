export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const input = new URL(request.url).searchParams;
  const target = new URL(`/workspaces/${id}/learning-map`, request.url);
  target.searchParams.set("view", "walkthrough");
  for (const key of ["path", "step", "branches"]) {
    const value = input.get(key);
    if (value && value.length < 8000) target.searchParams.set(key, value);
  }
  return new Response(null, { status: 307, headers: { Location: target.pathname + target.search } });
}
