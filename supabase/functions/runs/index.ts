import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const ownerId = await requireUserId(req);
    const body = await req.json().catch(() => ({}));

    const conv_uid = typeof body?.conv_uid === "string" ? body.conv_uid.trim() : "";
    const schema_id = typeof body?.schema_id === "string" ? body.schema_id.trim() : "";
    const model_config = body?.model_config ?? null;

    if (!conv_uid) return json(400, { error: "Missing conv_uid" });
    if (!schema_id) return json(400, { error: "Missing schema_id" });
    if (!isUuid(schema_id)) return json(400, { error: "Invalid schema_id" });

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.rpc("create_run_v2", {
      p_owner_id: ownerId,
      p_conv_uid: conv_uid,
      p_schema_id: schema_id,
    });

    if (error) return json(400, { error: error.message });
    const run_id = data;
    if (!run_id) return json(500, { error: "RPC returned no run_id" });

    // Set model_config if provided (create_run_v2 RPC doesn't accept it directly)
    if (model_config) {
      await supabaseAdmin
        .from("runs_v2")
        .update({ model_config })
        .eq("run_id", run_id);
    }

    // Fetch total_blocks from the newly created run
    const { data: runRow } = await supabaseAdmin
      .from("runs_v2")
      .select("total_blocks")
      .eq("run_id", run_id)
      .single();

    return json(200, { run_id, total_blocks: runRow?.total_blocks ?? 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(400, { error: msg });
  }
});
