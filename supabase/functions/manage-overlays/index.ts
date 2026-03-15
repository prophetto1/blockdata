import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createUserClient, requireUserId } from "../_shared/supabase.ts";
import { loadArangoConfigFromEnv, syncOverlaysToArango } from "../_shared/arangodb.ts";

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
    const userId = await requireUserId(req);
    const authHeader = req.headers.get("Authorization");
    const { action, run_id, block_uids, block_uid, staging_jsonb } = await req.json();

    if (!run_id || typeof run_id !== "string") {
      return json(400, { error: "Missing run_id" });
    }

    const userClient = createUserClient(authHeader);
    const adminClient = createAdminClient();

    let count = 0;
    let affectedBlockUids: string[] = [];

    if (action === "confirm") {
      const { data, error } = await userClient.rpc("confirm_overlays", {
        p_run_id: run_id,
        p_block_uids: block_uids ?? null,
      });
      if (error) return json(400, { error: error.message });
      count = Number(data ?? 0);
      affectedBlockUids = block_uids ?? [];
    } else if (action === "reject") {
      const { data, error } = await userClient.rpc("reject_overlays_to_pending", {
        p_run_id: run_id,
        p_block_uids: block_uids ?? null,
      });
      if (error) return json(400, { error: error.message });
      count = Number(data ?? 0);
      affectedBlockUids = block_uids ?? [];
    } else if (action === "update_staging") {
      if (!block_uid || typeof block_uid !== "string") {
        return json(400, { error: "Missing block_uid for update_staging" });
      }
      const { error } = await userClient.rpc("update_overlay_staging", {
        p_run_id: run_id,
        p_block_uid: block_uid,
        p_staging_jsonb: staging_jsonb,
      });
      if (error) return json(400, { error: error.message });
      count = 1;
      affectedBlockUids = [block_uid];
    } else {
      return json(400, { error: `Unknown action: ${action}` });
    }

    // Sync affected overlays to Arango (partial-failure safe)
    const arangoConfig = loadArangoConfigFromEnv();
    if (arangoConfig) {
      try {
        let query = adminClient
          .from("block_overlays")
          .select("overlay_uid, run_id, block_uid, status, overlay_jsonb_staging, overlay_jsonb_confirmed, claimed_by, claimed_at, attempt_count, last_error, confirmed_at, confirmed_by")
          .eq("run_id", run_id);

        if (affectedBlockUids.length > 0) {
          query = query.in("block_uid", affectedBlockUids);
        }

        const { data: overlayRows } = await query;

        if (overlayRows && overlayRows.length > 0) {
          // Verify ownership before syncing
          const { data: runRow } = await adminClient
            .from("runs")
            .select("conv_uid, owner_id")
            .eq("run_id", run_id)
            .single();

          if (!runRow || runRow.owner_id !== userId) {
            return json(403, { error: "Not authorized" });
          }

          const { data: ancestry } = await adminClient
            .from("conversion_parsing")
            .select("source_uid")
            .eq("conv_uid", runRow.conv_uid)
            .single();
          const { data: docRow } = await adminClient
            .from("source_documents")
            .select("project_id")
            .eq("source_uid", ancestry!.source_uid)
            .single();

          await syncOverlaysToArango(arangoConfig, overlayRows.map((o) => ({
            ...o,
            source_uid: ancestry!.source_uid,
            conv_uid: runRow.conv_uid,
            project_id: docRow!.project_id,
            owner_id: runRow.owner_id,
          })));
        }
      } catch (err) {
        // Postgres mutation already committed — enqueue retry and report partial success
        console.error("manage-overlays: Arango sync failed, writing outbox row:", err);
        // Resolve source_uid for the outbox entry (best-effort)
        try {
          const { data: runRow } = await adminClient
            .from("runs").select("conv_uid").eq("run_id", run_id).single();
          if (runRow) {
            const { data: ancestry } = await adminClient
              .from("conversion_parsing").select("source_uid").eq("conv_uid", runRow.conv_uid).single();
            if (ancestry) {
              await adminClient.from("cleanup_outbox").insert({
                source_uid: ancestry.source_uid,
                action: "overlay_sync",
                last_error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        } catch (outboxErr) {
          console.error("manage-overlays: outbox write also failed:", outboxErr);
        }
        return json(207, { ok: true, count, partial: true, error: "Arango sync pending" });
      }
    }

    return json(200, { ok: true, count });
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : String(err) });
  }
});
