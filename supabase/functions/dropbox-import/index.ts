import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { getEnv } from "../_shared/env.ts";
import { concatBytes, sha256Hex } from "../_shared/hash.ts";
import { loadRuntimePolicy } from "../_shared/admin_policy.ts";
import { sanitizeFilename } from "../_shared/sanitize.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";
import { detectSourceTypeForUpload, uploadToStorage } from "../ingest/storage.ts";
import { resolveIngestRoute } from "../ingest/routing.ts";
import { validateProjectOwnership, checkIdempotency } from "../ingest/validate.ts";
import { processUploadOnly } from "../ingest/process-upload-only.ts";
import { processConversion } from "../ingest/process-convert.ts";
import type { IngestContext } from "../ingest/types.ts";

// ── Types ────────────────────────────────────────────────────────────────────

type FileResult = {
  file_id: string;
  source_uid: string | null;
  status: "ok" | "error";
  error?: string;
};

type RequestFile = {
  id: string;
  name: string;
  link: string;
  bytes?: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function parseIngestMode(value: unknown): "ingest" | "upload_only" {
  if (typeof value !== "string") return "upload_only";
  return value.trim().toLowerCase() === "ingest" ? "ingest" : "upload_only";
}

// ── Download from Dropbox direct link ────────────────────────────────────────

async function downloadFromDropbox(
  link: string,
): Promise<Uint8Array> {
  const resp = await fetch(link);
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      `Dropbox download failed (${resp.status}): ${text.slice(0, 300)}`,
    );
  }
  return new Uint8Array(await resp.arrayBuffer());
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const ownerId = await requireUserId(req);

    const body = await req.json();
    const {
      project_id,
      files,
      ingest_mode: rawMode,
    } = body as {
      project_id?: unknown;
      files?: unknown;
      ingest_mode?: unknown;
    };

    // ── Validate request ──────────────────────────────────────────────────
    if (!project_id || typeof project_id !== "string") {
      return json(400, { error: "Missing or invalid project_id" });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return json(400, { error: "Missing or empty files array" });
    }

    const ingestMode = parseIngestMode(rawMode);
    const supabaseAdmin = createAdminClient();
    const runtimePolicy = await loadRuntimePolicy(supabaseAdmin);

    await validateProjectOwnership(supabaseAdmin, project_id, ownerId);

    const bucket = getEnv("DOCUMENTS_BUCKET", "documents");
    const results: FileResult[] = [];

    // Process files sequentially to avoid overwhelming Dropbox rate limits
    for (const file of files as RequestFile[]) {
      try {
        if (!file.link || typeof file.link !== "string") {
          throw new Error("File is missing a download link");
        }

        // 1. Download from Dropbox direct link
        const fileBytes = await downloadFromDropbox(file.link);

        // 2. Determine filename
        const originalFilename = sanitizeFilename(file.name || "download");

        // 3. Detect source type and ingest route
        const source_type = detectSourceTypeForUpload(originalFilename, "");
        const route = resolveIngestRoute(originalFilename, runtimePolicy);

        // 4. Content-addressed source_uid (same as ingest + google-drive-import)
        const sourceUidPrefix = new TextEncoder().encode(`${source_type}\n`);
        const source_uid = await sha256Hex(
          concatBytes([sourceUidPrefix, fileBytes]),
        );
        const source_key = `uploads/${source_uid}/${originalFilename}`;

        // 5. Idempotency check
        const idem = await checkIdempotency(supabaseAdmin, source_uid, ownerId);
        if (idem.action === "return_existing") {
          if (project_id !== idem.currentProjectId) {
            await supabaseAdmin
              .from("source_documents")
              .update({
                project_id,
                updated_at: new Date().toISOString(),
              })
              .eq("source_uid", source_uid);
          }
          results.push({ file_id: file.id, source_uid, status: "ok" });
          continue;
        }

        // 6. Upload to Supabase storage
        await uploadToStorage(
          supabaseAdmin,
          bucket,
          source_key,
          fileBytes,
          source_type,
          "",
        );

        // 7. Process through ingest pipeline
        const ctx: IngestContext = {
          supabaseAdmin,
          runtimePolicy,
          ownerId,
          ingest_track: route?.track ?? "docling",
          source_uid,
          source_type,
          source_key,
          bucket,
          fileBytes,
          originalFilename,
          requestedTitle: "",
          project_id,
        };

        if (ingestMode === "upload_only" || !route) {
          await processUploadOnly(ctx);
        } else {
          await processConversion(ctx);
        }

        results.push({ file_id: file.id, source_uid, status: "ok" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({
          file_id: file.id,
          source_uid: null,
          status: "error",
          error: msg,
        });
      }
    }

    return json(200, { results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const httpStatus = msg.includes("not owned by you") ? 403 : 400;
    return json(httpStatus, { error: msg });
  }
});