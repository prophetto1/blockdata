import { requireEnv } from "../_shared/env.ts";
import { basenameNoExt } from "../_shared/sanitize.ts";
import type { IngestContext, IngestResponse, SignedUploadTarget } from "./types.ts";

/**
 * Process a non-markdown file: create documents_v2 row, call Python conversion service.
 */
export async function processConversion(ctx: IngestContext): Promise<{ status: number; body: IngestResponse }> {
  const {
    supabaseAdmin,
    ingest_track,
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

  const conversion_job_id = crypto.randomUUID();
  const fallbackTitle = basenameNoExt(originalFilename);
  const doc_title = requestedTitle || fallbackTitle;

  // Insert documents_v2 row (no conv_uid yet - conversion service will provide it).
  {
    const { error } = await supabaseAdmin.from("documents_v2").insert({
      source_uid,
      owner_id: ownerId,
      source_type,
      source_filesize: fileBytes.byteLength,
      source_total_characters: null,
      source_locator: source_key,
      doc_title,
      conv_uid: null,
      conv_status: null,
      conv_parsing_tool: null,
      conv_representation_type: null,
      conv_total_blocks: null,
      conv_block_type_freq: null,
      conv_total_characters: null,
      conv_locator: null,
      project_id,
      status: "converting",
      conversion_job_id,
      error: null,
    });
    if (error) throw new Error(`DB insert documents_v2 failed: ${error.message}`);
  }

  // Signed download URL for conversion service to fetch the original.
  const { data: signedDownload, error: dlErr } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(source_key, 60 * 10);
  if (dlErr || !signedDownload?.signedUrl) {
    throw new Error(`Create signed download URL failed: ${dlErr?.message ?? "unknown"}`);
  }

  // Signed upload URL for the converted markdown output.
  const md_key = `converted/${source_uid}/${basenameNoExt(originalFilename)}.md`;
  const { data: signedUpload, error: ulErr } = await (supabaseAdmin.storage as any)
    .from(bucket)
    .createSignedUploadUrl(md_key);
  if (ulErr || !signedUpload?.signedUrl) {
    throw new Error(`Create signed upload URL failed: ${ulErr?.message ?? "unknown"}`);
  }

  // Docling JSON output: Docling-handled non-md formats get a sidecar JSON.
  let docling_output: SignedUploadTarget | null = null;
  if (ingest_track === "docling") {
    const docling_key = `converted/${source_uid}/${basenameNoExt(originalFilename)}.docling.json`;
    const { data: doclingUpload, error: doclingErr } = await (supabaseAdmin.storage as any)
      .from(bucket)
      .createSignedUploadUrl(docling_key);
    if (doclingErr || !doclingUpload?.signedUrl) {
      throw new Error(`Create signed upload URL for docling json failed: ${doclingErr?.message ?? "unknown"}`);
    }
    docling_output = {
      bucket,
      key: docling_key,
      signed_upload_url: doclingUpload.signedUrl,
      token: doclingUpload.token ?? null,
    };
  }
  let pandoc_output: SignedUploadTarget | null = null;
  if (ingest_track === "pandoc") {
    const pandoc_key = `converted/${source_uid}/${basenameNoExt(originalFilename)}.pandoc.ast.json`;
    const { data: pandocUpload, error: pandocErr } = await (supabaseAdmin.storage as any)
      .from(bucket)
      .createSignedUploadUrl(pandoc_key);
    if (pandocErr || !pandocUpload?.signedUrl) {
      throw new Error(`Create signed upload URL for pandoc AST failed: ${pandocErr?.message ?? "unknown"}`);
    }
    pandoc_output = {
      bucket,
      key: pandoc_key,
      signed_upload_url: pandocUpload.signedUrl,
      token: pandocUpload.token ?? null,
    };
  }

  // Call the conversion service.
  const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/+$/, "");
  const callback_url = `${supabaseUrl}/functions/v1/conversion-complete`;
  const conversionServiceUrl = requireEnv("CONVERSION_SERVICE_URL").replace(/\/+$/, "");
  const conversionKey = requireEnv("CONVERSION_SERVICE_KEY");

  let convertResp: Response;
  try {
    convertResp = await fetch(`${conversionServiceUrl}/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conversion-Service-Key": conversionKey,
      },
      body: JSON.stringify({
        source_uid,
        conversion_job_id,
        track: ingest_track,
        source_type,
        source_download_url: signedDownload.signedUrl,
        output: {
          bucket,
          key: md_key,
          signed_upload_url: signedUpload.signedUrl,
          token: signedUpload.token ?? null,
        },
        docling_output,
        pandoc_output,
        callback_url,
      }),
    });
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    await supabaseAdmin
      .from("documents_v2")
      .update({ status: "conversion_failed", error: `conversion service unreachable: ${msg}`.slice(0, 1000) })
      .eq("source_uid", source_uid);
    return { status: 502, body: { source_uid, conv_uid: null, status: "conversion_failed", error: `conversion service unreachable: ${msg}` } };
  }

  if (!convertResp.ok) {
    const msg = await convertResp.text().catch(() => "");
    await supabaseAdmin
      .from("documents_v2")
      .update({ status: "conversion_failed", error: `conversion request failed: HTTP ${convertResp.status} ${msg}`.slice(0, 1000) })
      .eq("source_uid", source_uid);
    return { status: 502, body: { source_uid, conv_uid: null, status: "conversion_failed", error: "conversion request failed" } };
  }

  return { status: 202, body: { source_uid, conv_uid: null, status: "converting" } };
}
