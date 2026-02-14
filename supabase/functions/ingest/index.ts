import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { getEnv } from "../_shared/env.ts";
import { concatBytes, sha256Hex } from "../_shared/hash.ts";
import { loadRuntimePolicy } from "../_shared/admin_policy.ts";
import { sanitizeFilename } from "../_shared/sanitize.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";
import type { IngestContext } from "./types.ts";
import { uploadToStorage } from "./storage.ts";
import { resolveIngestRoute } from "./routing.ts";
import { validateProjectOwnership, checkIdempotency } from "./validate.ts";
import { processMarkdown } from "./process-md.ts";
import { processConversion } from "./process-convert.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const ownerId = await requireUserId(req);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json(400, { error: "Missing file" });

    // Parse form fields.
    const docTitleRaw = form.get("doc_title");
    const requestedTitle = typeof docTitleRaw === "string" ? docTitleRaw.trim() : "";
    const projectIdRaw = form.get("project_id");
    let project_id = typeof projectIdRaw === "string" && projectIdRaw.trim() ? projectIdRaw.trim() : null;

    const originalFilename = sanitizeFilename(file.name || "upload");
    const supabaseAdmin = createAdminClient();
    const runtimePolicy = await loadRuntimePolicy(supabaseAdmin);
    const route = resolveIngestRoute(originalFilename, runtimePolicy);
    const source_type = route.source_type;
    const ingest_track = route.track;

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const sourceUidPrefix = new TextEncoder().encode(`${source_type}\n`);
    const source_uid = await sha256Hex(concatBytes([sourceUidPrefix, fileBytes]));

    const bucket = getEnv("DOCUMENTS_BUCKET", "documents");
    const source_key = `uploads/${source_uid}/${originalFilename}`;

    // Gap 2: Validate project ownership (service-role bypasses RLS).
    if (project_id) {
      await validateProjectOwnership(supabaseAdmin, project_id, ownerId);
    }

    // Idempotency check + retry handling (Gap 4: preserves previous project_id).
    const idem = await checkIdempotency(supabaseAdmin, source_uid, ownerId);
    if (idem.action === "return_existing") {
      return json(200, idem.response);
    }
    if (idem.action === "retry") {
      // Gap 4: If caller didn't send project_id, fall back to the deleted row's value.
      project_id = project_id ?? idem.previousProjectId;
    }

    // Upload to Storage with correct MIME type.
    await uploadToStorage(supabaseAdmin, bucket, source_key, fileBytes, source_type, file.type);

    // Build shared context for processors.
    const ctx: IngestContext = {
      supabaseAdmin, runtimePolicy, ownerId, ingest_track, source_uid, source_type, source_key,
      bucket, fileBytes, originalFilename, requestedTitle, project_id,
    };

    if (source_type === "md") {
      const resp = await processMarkdown(ctx);
      const httpStatus = resp.status === "ingest_failed" ? 500 : 200;
      return json(httpStatus, resp);
    }

    const { status, body } = await processConversion(ctx);
    return json(status, body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Gap 2 validation errors surface as 403.
    const httpStatus = msg.includes("not owned by you") ? 403 : 400;
    return json(httpStatus, { error: msg });
  }
});
