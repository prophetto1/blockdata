import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import {
  createAdminClient,
  createUserClient,
  requireUserId,
} from "../_shared/supabase.ts";
import {
  deleteProjectionForSourceFromArango,
  loadArangoConfigFromEnv,
  resetProjectionForSourceInArango,
} from "../_shared/arangodb.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    await requireUserId(req);
    const authHeader = req.headers.get("Authorization");
    const { action, source_uid } = await req.json();

    if (!source_uid || typeof source_uid !== "string") {
      return json(400, { error: "Missing source_uid" });
    }
    if (action !== "delete" && action !== "reset") {
      return json(400, { error: `Unknown action: ${action}` });
    }

    // RPC via user client — SECURITY DEFINER checks auth.uid() = owner_id
    const userClient = createUserClient(authHeader);
    const rpcName = action === "delete" ? "delete_source_document" : "reset_source_document";
    const { error: rpcErr } = await userClient.rpc(rpcName, { p_source_uid: source_uid });
    if (rpcErr) return json(400, { error: rpcErr.message });

    // Arango cleanup via admin client
    const arangoConfig = loadArangoConfigFromEnv();
    if (arangoConfig) {
      try {
        if (action === "delete") {
          await deleteProjectionForSourceFromArango(arangoConfig, source_uid);
        } else {
          await resetProjectionForSourceInArango(arangoConfig, source_uid);
        }
      } catch (err) {
        // Postgres succeeded but Arango failed — write outbox for retry
        const adminClient = createAdminClient();
        await adminClient.from("cleanup_outbox").insert({
          source_uid,
          action,
          last_error: err instanceof Error ? err.message : String(err),
        });
        return json(207, {
          ok: false,
          partial: true,
          error: "Arango cleanup pending",
        });
      }
    }

    return json(200, { ok: true });
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : String(err) });
  }
});