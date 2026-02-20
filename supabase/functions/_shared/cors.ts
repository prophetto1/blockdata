export const DEFAULT_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-conversion-service-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

export function withCorsHeaders(
  headers: HeadersInit | undefined,
  extra: Record<string, string> = {},
): Headers {
  const out = new Headers(headers);
  for (const [k, v] of Object.entries(DEFAULT_CORS_HEADERS)) out.set(k, v);
  for (const [k, v] of Object.entries(extra)) out.set(k, v);
  return out;
}

export function corsPreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, {
    status: 204,
    headers: withCorsHeaders(undefined),
  });
}
