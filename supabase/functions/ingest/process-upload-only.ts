import { basenameNoExt } from "../_shared/sanitize.ts";
import type { IngestContext, IngestResponse } from "./types.ts";

/**
 * Upload-only path: persist source_documents row and return immediately.
 * Parsing/conversion is intentionally deferred to an explicit parse action.
 */
export async function processUploadOnly(
  ctx: IngestContext,
): Promise<{ status: number; body: IngestResponse }> {
  const {
    supabaseAdmin,
    source_uid,
    source_type,
    source_key,
    fileBytes,
    originalFilename,
    requestedTitle,
    project_id,
    ownerId,
  } = ctx;

  const fallbackTitle = basenameNoExt(originalFilename);
  const doc_title = requestedTitle || fallbackTitle;

  const { error } = await supabaseAdmin.from("source_documents").insert({
    source_uid,
    owner_id: ownerId,
    source_type,
    source_filesize: fileBytes.byteLength,
    source_total_characters: null,
    source_locator: source_key,
    doc_title,
    project_id,
    status: "uploaded",
    conversion_job_id: null,
    error: null,
  });
  if (error) throw new Error(`DB insert source_documents failed: ${error.message}`);

  return {
    status: 200,
    body: {
      source_uid,
      conv_uid: null,
      status: "uploaded",
    },
  };
}
