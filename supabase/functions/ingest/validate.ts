import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { IngestResponse } from "./types.ts";

/**
 * Gap 2: Validate that the caller owns the target project.
 * The ingest function runs with service-role credentials (bypasses RLS),
 * so we must check ownership explicitly.
 */
export async function validateProjectOwnership(
  supabaseAdmin: SupabaseClient,
  projectId: string,
  ownerId: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error(`Project lookup failed: ${error.message}`);
  if (!data) throw new Error("Project not found or not owned by you");
}

export type IdempotencyResult =
  | { action: "return_existing"; response: IngestResponse }
  | { action: "retry"; previousProjectId: string | null }
  | { action: "proceed" };

/**
 * Idempotency check + retry handling.
 * - If another user owns the same source_uid → throws (409).
 * - If same user, doc exists and not failed → return existing.
 * - If same user, doc failed → delete stale rows, return retry with previous project_id (Gap 4).
 * - If no existing row → proceed.
 */
export async function checkIdempotency(
  supabaseAdmin: SupabaseClient,
  sourceUid: string,
  ownerId: string,
): Promise<IdempotencyResult> {
  const { data: existing, error } = await supabaseAdmin
    .from("documents_v2")
    .select("source_uid, owner_id, conv_uid, status, error, project_id")
    .eq("source_uid", sourceUid)
    .maybeSingle();

  if (error) throw new Error(`DB lookup documents_v2 failed: ${error.message}`);
  if (!existing) return { action: "proceed" };

  if (existing.owner_id !== ownerId) {
    throw new Error(
      "This exact file content already exists under a different owner. " +
      "Current schema uses source_uid as a global primary key, so identical bytes cannot be uploaded by multiple users."
    );
  }

  // Allow retry for failed conversions: delete the stale row and re-process.
  if (existing.status === "conversion_failed" || existing.status === "ingest_failed") {
    const previousProjectId: string | null = existing.project_id ?? null;
    await supabaseAdmin.from("blocks_v2").delete().eq("conv_uid", existing.conv_uid ?? "");
    await supabaseAdmin.from("documents_v2").delete().eq("source_uid", sourceUid);
    return { action: "retry", previousProjectId };
  }

  return {
    action: "return_existing",
    response: {
      source_uid: sourceUid,
      conv_uid: existing.conv_uid ?? null,
      status: existing.status ?? "uploaded",
      error: existing.error ?? undefined,
    },
  };
}
