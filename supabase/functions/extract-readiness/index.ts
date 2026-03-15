import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { requireUserId } from "../_shared/supabase.ts";
import { getVertexAccessToken } from "../_shared/vertex_auth.ts";
import { checkExtractReadiness } from "./readiness_check.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    await requireUserId(req);
  } catch {
    return json(401, { error: "Unauthorized" });
  }

  // Phase 1: env var check (only SA key is hard-required;
  // GCP_VERTEX_PROJECT_ID defaults to "agchain" in vertex_auth.ts)
  const envResult = checkExtractReadiness({
    gcpVertexSaKey: Deno.env.get("GCP_VERTEX_SA_KEY"),
  });

  if (!envResult.is_ready) {
    return json(200, envResult);
  }

  // Phase 2: live token exchange
  try {
    await getVertexAccessToken();
    return json(200, { is_ready: true, reasons: [] });
  } catch (error) {
    return json(200, {
      is_ready: false,
      reasons: [error instanceof Error ? error.message : String(error)],
    });
  }
});
