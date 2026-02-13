import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { loadRuntimePolicy } from "../_shared/admin_policy.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  try {
    await requireUserId(req);
    const supabaseAdmin = createAdminClient();
    const policy = await loadRuntimePolicy(supabaseAdmin);

    return json(200, {
      upload: {
        max_files_per_batch: policy.upload.max_files_per_batch,
        allowed_extensions: policy.upload.allowed_extensions,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Missing Authorization header") || msg.startsWith("Invalid auth")) {
      return json(401, { error: msg });
    }
    return json(400, { error: msg });
  }
});
