export function sameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  try {
    // Next standalone may reconstruct request.url using localhost. Host preserves
    // the browser-facing loopback origin; forwarded headers are not trusted.
    const url = new URL(request.url);
    const expected = new URL(`${url.protocol}//${request.headers.get("host") ?? url.host}`);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(expected.hostname)) return false;
    return (!origin || origin === expected.origin) && (!site || site === "same-origin" || site === "none");
  } catch { return false; }
}
