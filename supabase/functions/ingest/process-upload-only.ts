import {
  loadArangoConfigFromEnv,
  syncAssetToArango,
} from "../_shared/arangodb.ts";
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
    bucket,
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

  const arangoConfig = loadArangoConfigFromEnv();
  if (arangoConfig) {
    try {
      await syncAssetToArango(arangoConfig, {
        source_uid,
        project_id,
        owner_id: ownerId,
        source_type,
        doc_title,
        source_locator: source_key,
        source_filesize: fileBytes.byteLength,
        source_total_characters: null,
        status: "uploaded",
        conversion_job_id: null,
        error: null,
        uploaded_at: null,
        updated_at: null,
        conv_uid: null,
        conv_locator: null,
        conv_status: null,
        conv_representation_type: null,
        pipeline_config: null,
        block_count: null,
      });
    } catch (error) {
      await supabaseAdmin.from("source_documents").delete().eq("source_uid", source_uid);
      await supabaseAdmin.storage.from(bucket).remove([source_key]);
      throw error;
    }
  }

  return {
    status: 200,
    body: {
      source_uid,
      conv_uid: null,
      status: "uploaded",
    },
  };
}
