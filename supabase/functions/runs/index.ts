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

    const doc_uid = typeof body?.doc_uid === "string" ? body.doc_uid.trim() : "";
    const schema_id = typeof body?.schema_id === "string" ? body.schema_id.trim() : "";

    if (!doc_uid) return json(400, { error: "Missing doc_uid" });
    if (!schema_id) return json(400, { error: "Missing schema_id" });
    if (!isUuid(schema_id)) return json(400, { error: "Invalid schema_id" });

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.rpc("create_annotation_run", {
      p_owner_id: ownerId,
      p_doc_uid: doc_uid,
      p_schema_id: schema_id,
    });

    if (error) return json(400, { error: error.message });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.run_id) return json(500, { error: "RPC returned no run_id" });

    return json(200, { run_id: row.run_id, total_blocks: row.total_blocks });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(400, { error: msg });
  }
});

