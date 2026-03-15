import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { loadAdminPolicyValue, loadRuntimePolicy } from "../_shared/admin_policy.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";

const DOCUMENT_VIEW_MODE_POLICY_KEY = "platform.docling_blocks_mode";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function normalizeDocumentViewMode(value: unknown): "normalized" | "raw_docling" {
  return value === "raw_docling" ? "raw_docling" : "normalized";
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  try {
    await requireUserId(req);
    const supabaseAdmin = createAdminClient();
    const policy = await loadRuntimePolicy(supabaseAdmin);
    const documentViewMode = normalizeDocumentViewMode(
      await loadAdminPolicyValue(supabaseAdmin, DOCUMENT_VIEW_MODE_POLICY_KEY),
    );

    return json(200, {
      upload: {
        max_files_per_batch: policy.upload.max_files_per_batch,
      },
      platform: {
        docling_blocks_mode: documentViewMode,
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
