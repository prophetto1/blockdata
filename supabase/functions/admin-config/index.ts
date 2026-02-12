import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  applyPolicyValue,
  buildRuntimePolicySnapshot,
  listAdminPolicyRows,
  loadRuntimePolicy,
  validateRuntimePolicy,
} from "../_shared/admin_policy.ts";
import { requireSuperuser } from "../_shared/superuser.ts";

type PolicyUpdate = {
  policy_key: string;
  value: unknown;
  reason?: string | null;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function parseAuditLimit(req: Request): number {
  const url = new URL(req.url);
  const raw = Number(url.searchParams.get("audit_limit") ?? "100");
  if (!Number.isFinite(raw)) return 100;
  return Math.min(Math.max(Math.floor(raw), 1), 500);
}

function parseUpdates(body: unknown): PolicyUpdate[] | null {
  if (body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).updates)) {
    const updates = (body as { updates: unknown[] }).updates;
    const parsed: PolicyUpdate[] = [];
    for (const item of updates) {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const policyKey = typeof obj.policy_key === "string" ? obj.policy_key.trim() : "";
      if (!policyKey) return null;
      parsed.push({
        policy_key: policyKey,
        value: obj.value,
        reason: typeof obj.reason === "string" ? obj.reason.trim() : null,
      });
    }
    return parsed;
  }

  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    const policyKey = typeof obj.policy_key === "string" ? obj.policy_key.trim() : "";
    if (!policyKey) return null;
    return [{
      policy_key: policyKey,
      value: obj.value,
      reason: typeof obj.reason === "string" ? obj.reason.trim() : null,
    }];
  }

  return null;
}

function valueTypeMatches(value: unknown, valueType: string): boolean {
  if (valueType === "boolean") return typeof value === "boolean";
  if (valueType === "integer") return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
  if (valueType === "number") return typeof value === "number" && Number.isFinite(value);
  if (valueType === "string") return typeof value === "string";
  if (valueType === "object") return !!value && typeof value === "object" && !Array.isArray(value);
  if (valueType === "array") return Array.isArray(value);
  return false;
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    const superuser = await requireSuperuser(req);
    const supabaseAdmin = createAdminClient();

    if (req.method === "GET") {
      const auditLimit = parseAuditLimit(req);
      const policyRows = await listAdminPolicyRows(supabaseAdmin);
      const { data: auditRows, error: auditErr } = await supabaseAdmin
        .from("admin_runtime_policy_audit")
        .select("audit_id, policy_key, old_value_jsonb, new_value_jsonb, changed_by, changed_at, reason")
        .order("changed_at", { ascending: false })
        .limit(auditLimit);
      if (auditErr && !auditErr.message.toLowerCase().includes("admin_runtime_policy_audit")) {
        return json(500, { error: `Failed to load policy audit: ${auditErr.message}` });
      }

      const runtimePolicy = await loadRuntimePolicy(supabaseAdmin);
      return json(200, {
        superuser: {
          user_id: superuser.userId,
          email: superuser.email,
        },
        policy_snapshot_preview: buildRuntimePolicySnapshot(runtimePolicy, new Date().toISOString()),
        policies: policyRows.map((row) => ({
          policy_key: row.policy_key,
          value: row.value_jsonb,
          value_type: row.value_type,
          description: row.description,
          updated_at: row.updated_at,
          updated_by: row.updated_by,
        })),
        audit: (auditRows ?? []).map((row: Record<string, unknown>) => ({
          audit_id: row.audit_id,
          policy_key: row.policy_key,
          old_value: row.old_value_jsonb,
          new_value: row.new_value_jsonb,
          changed_by: row.changed_by,
          changed_at: row.changed_at,
          reason: row.reason,
        })),
      });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = await req.json().catch(() => null);
      const updates = parseUpdates(body);
      if (!updates || updates.length === 0) {
        return json(400, { error: "Invalid update payload. Provide policy_key/value or updates[]" });
      }

      const policyRows = await listAdminPolicyRows(supabaseAdmin);
      const rowByKey = new Map(policyRows.map((row) => [row.policy_key, row]));

      // Validate keys and value types first.
      for (const update of updates) {
        const row = rowByKey.get(update.policy_key);
        if (!row) {
          return json(400, { error: `Unknown policy key: ${update.policy_key}` });
        }
        if (!valueTypeMatches(update.value, row.value_type)) {
          return json(400, {
            error:
              `Type mismatch for ${update.policy_key}: expected ${row.value_type}, got ${typeof update.value}`,
          });
        }
      }

      // Build candidate policy and validate cross-field constraints before writes.
      const candidatePolicy = await loadRuntimePolicy(supabaseAdmin);
      for (const update of updates) {
        const ok = applyPolicyValue(candidatePolicy, update.policy_key, update.value);
        if (!ok) {
          return json(400, { error: `Invalid value for ${update.policy_key}` });
        }
      }
      const validationErrors = validateRuntimePolicy(candidatePolicy);
      if (validationErrors.length > 0) {
        return json(400, { error: "Policy validation failed", details: validationErrors });
      }

      const applied: string[] = [];
      for (const update of updates) {
        const row = rowByKey.get(update.policy_key);
        if (!row) continue;
        const oldValue = row.value_jsonb;
        const newValue = update.value;

        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
          continue;
        }

        const { error: updateErr } = await supabaseAdmin
          .from("admin_runtime_policy")
          .update({
            value_jsonb: newValue,
            updated_by: superuser.userId,
          })
          .eq("policy_key", update.policy_key);
        if (updateErr) {
          return json(500, { error: `Failed to update ${update.policy_key}: ${updateErr.message}` });
        }

        const { error: auditErr } = await supabaseAdmin
          .from("admin_runtime_policy_audit")
          .insert({
            policy_key: update.policy_key,
            old_value_jsonb: oldValue,
            new_value_jsonb: newValue,
            changed_by: superuser.userId,
            reason: update.reason ?? null,
          });
        if (auditErr) {
          return json(500, { error: `Failed to write audit for ${update.policy_key}: ${auditErr.message}` });
        }
        applied.push(update.policy_key);
      }

      const refreshedRows = await listAdminPolicyRows(supabaseAdmin);
      return json(200, {
        ok: true,
        applied_count: applied.length,
        applied_keys: applied,
        policies: refreshedRows.map((row) => ({
          policy_key: row.policy_key,
          value: row.value_jsonb,
          value_type: row.value_type,
          description: row.description,
          updated_at: row.updated_at,
          updated_by: row.updated_by,
        })),
      });
    }

    return json(405, { error: "Method not allowed" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Missing Authorization header") || msg.startsWith("Invalid auth")) {
      return json(401, { error: msg });
    }
    if (msg.includes("Forbidden: superuser access required")) {
      return json(403, { error: msg });
    }
    if (msg.includes("Superuser access is not configured")) {
      return json(503, { error: msg });
    }
    return json(500, { error: msg });
  }
});
