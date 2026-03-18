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

// ── Google Workspace → Office export mapping ────────────────────────────────

const GOOGLE_EXPORT_MAP: Record<string, { exportMime: string; ext: string }> = {
  "application/vnd.google-apps.document": {
    exportMime:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx",
  },
  "application/vnd.google-apps.spreadsheet": {
    exportMime:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
  },
  "application/vnd.google-apps.presentation": {
    exportMime:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ext: "pptx",
  },
};

function isGoogleWorkspaceType(mimeType: string): boolean {
  return mimeType.startsWith("application/vnd.google-apps.");
}

// ── Google Drive download ───────────────────────────────────────────────────

async function downloadFromDrive(
  fileId: string,
  mimeType: string,
  accessToken: string,
): Promise<{ bytes: Uint8Array; filenameExt: string | null }> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const exportInfo = GOOGLE_EXPORT_MAP[mimeType];
  if (exportInfo) {
    // Google Workspace file → export to Office format
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportInfo.exportMime)}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(
        `Google Drive export failed (${resp.status}): ${text.slice(0, 300)}`,
      );
    }
    return {
      bytes: new Uint8Array(await resp.arrayBuffer()),
      filenameExt: exportInfo.ext,
    };
  }

  if (isGoogleWorkspaceType(mimeType)) {
    throw new Error(`Unsupported Google Workspace type: ${mimeType}`);
  }

  // Binary file → download directly
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      `Google Drive download failed (${resp.status}): ${text.slice(0, 300)}`,
    );
  }
  return {
    bytes: new Uint8Array(await resp.arrayBuffer()),
    filenameExt: null,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type FileResult = {
  file_id: string;
  source_uid: string | null;
  status: "ok" | "error";
  error?: string;
};

type RequestFile = {
  id: string;
  name: string;
  mimeType: string;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function parseIngestMode(
  value: unknown,
): "ingest" | "upload_only" {
  if (typeof value !== "string") return "upload_only";
  return value.trim().toLowerCase() === "ingest" ? "ingest" : "upload_only";
}

// ── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const ownerId = await requireUserId(req);

    const body = await req.json();
    const {
      project_id,
      google_access_token,
      files,
      ingest_mode: rawMode,
    } = body as {
      project_id?: unknown;
      google_access_token?: unknown;
      files?: unknown;
      ingest_mode?: unknown;
    };

    // ── Validate request ────────────────────────────────────────────────
    if (!project_id || typeof project_id !== "string") {
      return json(400, { error: "Missing or invalid project_id" });
    }
    if (!google_access_token || typeof google_access_token !== "string") {
      return json(400, { error: "Missing or invalid google_access_token" });
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

    // Process files sequentially to respect Google API rate limits
    for (const file of files as RequestFile[]) {
      try {
        // 1. Download from Google Drive (export Workspace types, direct for binary)
        const { bytes: fileBytes, filenameExt } = await downloadFromDrive(
          file.id,
          file.mimeType,
          google_access_token as string,
        );

        // 2. Determine filename — append export extension for Workspace types
        let originalFilename = sanitizeFilename(file.name || "download");
        if (
          filenameExt &&
          !originalFilename.toLowerCase().endsWith(`.${filenameExt}`)
        ) {
          const dotIdx = originalFilename.lastIndexOf(".");
          const base =
            dotIdx > 0 ? originalFilename.slice(0, dotIdx) : originalFilename;
          originalFilename = `${base}.${filenameExt}`;
        }

        // 3. Accept the upload regardless of parse support.
        const source_type = detectSourceTypeForUpload(originalFilename, file.mimeType);
        const route = resolveIngestRoute(originalFilename, runtimePolicy);

        // 4. Content-addressed source_uid (same as ingest function)
        const sourceUidPrefix = new TextEncoder().encode(`${source_type}\n`);
        const source_uid = await sha256Hex(
          concatBytes([sourceUidPrefix, fileBytes]),
        );
        const source_key = `uploads/${source_uid}/${originalFilename}`;

        // 5. Idempotency check
        const idem = await checkIdempotency(supabaseAdmin, source_uid, ownerId);
        if (idem.action === "return_existing") {
          // Re-assign to target project if needed
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
