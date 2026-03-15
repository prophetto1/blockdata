import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";
import { classifyProfileReadiness } from "./readiness_check.ts";

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

  // parsing_profiles has columns: id (uuid), parser (text), config (jsonb)
  // Profile name is inside config->>'name', not a separate column.
  // Filter to docling profiles only — non-docling profiles have different
  // config shapes and would be misclassified by the Docling-specific classifier.
  const db = createAdminClient();
  const { data: profiles, error } = await db
    .from("parsing_profiles")
    .select("id, parser, config")
    .eq("parser", "docling");

  if (error) {
    return json(500, { error: error.message });
  }

  const results = (profiles ?? []).map((p) =>
    classifyProfileReadiness({
      profileId: p.id as string,
      parser: p.parser as string,
      config: (p.config ?? {}) as Record<string, unknown>,
    })
  );

  return json(200, { profiles: results });
});
