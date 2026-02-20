import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";
import { buildRuntimePolicySnapshot, loadRuntimePolicy } from "../_shared/admin_policy.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function parseRunOverrides(input: unknown): {
  model?: string;
  temperature?: number;
  max_tokens_per_block?: number;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const raw = input as Record<string, unknown>;
  const out: {
    model?: string;
    temperature?: number;
    max_tokens_per_block?: number;
  } = {};

  if (typeof raw.model === "string" && raw.model.trim().length > 0) {
    out.model = raw.model.trim();
  }
  if (typeof raw.temperature === "number" && Number.isFinite(raw.temperature)) {
    out.temperature = raw.temperature;
  }
  if (
    typeof raw.max_tokens_per_block === "number" &&
    Number.isFinite(raw.max_tokens_per_block) &&
    Number.isInteger(raw.max_tokens_per_block)
  ) {
    out.max_tokens_per_block = raw.max_tokens_per_block;
  }

  return out;
}

function isMissingRpcError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST202" ||
    /could not find the function/i.test(error.message ?? "") ||
    /function .* does not exist/i.test(error.message ?? "")
  );
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
    const runOverrides = parseRunOverrides(body?.model_config);

    if (!conv_uid) return json(400, { error: "Missing conv_uid" });
    if (!schema_id) return json(400, { error: "Missing schema_id" });
    if (!isUuid(schema_id)) return json(400, { error: "Invalid schema_id" });

    const supabaseAdmin = createAdminClient();
    const rpcParams = {
      p_owner_id: ownerId,
      p_conv_uid: conv_uid,
      p_schema_id: schema_id,
    };

    let { data, error } = await supabaseAdmin.rpc("create_run", rpcParams);
    if (error && isMissingRpcError(error)) {
      const fallback = await supabaseAdmin.rpc("create_run_v2", rpcParams);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) return json(400, { error: error.message });
    const run_id = data;
    if (!run_id) return json(500, { error: "RPC returned no run_id" });

    // Snapshot effective admin policy at run creation so mid-run policy edits do not drift behavior.
    const runtimePolicy = await loadRuntimePolicy(supabaseAdmin);
    const snapshotAt = new Date().toISOString();
    const policySnapshot = buildRuntimePolicySnapshot(runtimePolicy, snapshotAt);
    const model_config = {
      model: runOverrides.model ?? runtimePolicy.models.platform_default_model,
      temperature: runOverrides.temperature ?? runtimePolicy.models.platform_default_temperature,
      max_tokens_per_block:
        runOverrides.max_tokens_per_block ?? runtimePolicy.models.platform_default_max_tokens,
      policy_snapshot_at: snapshotAt,
      policy_snapshot: policySnapshot,
    };

    const { error: modelConfigErr } = await supabaseAdmin
      .from("runs")
      .update({ model_config })
      .eq("run_id", run_id);
    if (modelConfigErr) {
      return json(500, { error: `Failed to persist run policy snapshot: ${modelConfigErr.message}` });
    }

    // Fetch total_blocks from the newly created run
    const { data: runRow } = await supabaseAdmin
      .from("runs")
      .select("total_blocks")
      .eq("run_id", run_id)
      .single();

    return json(200, {
      run_id,
      total_blocks: runRow?.total_blocks ?? 0,
      policy_snapshot_at: snapshotAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(400, { error: msg });
  }
});
