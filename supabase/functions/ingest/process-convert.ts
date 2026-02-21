import { requireEnv } from "../_shared/env.ts";
import { basenameNoExt } from "../_shared/sanitize.ts";
import type { IngestContext, IngestResponse, SignedUploadTarget } from "./types.ts";

/**
 * Process a non-markdown file: create source_documents row, call Python conversion service.
 */
export async function processConversion(ctx: IngestContext): Promise<{ status: number; body: IngestResponse }> {
  const {
    supabaseAdmin,
    runtimePolicy,
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

  // Insert source_documents row (conversion_parsing row created later by conversion-complete callback).
  {
    const { error } = await supabaseAdmin.from("source_documents").insert({
      source_uid,
      owner_id: ownerId,
      source_type,
      source_filesize: fileBytes.byteLength,
      source_total_characters: null,
      source_locator: source_key,
      doc_title,
      project_id,
      status: "converting",
      conversion_job_id,
      error: null,
    });
    if (error) throw new Error(`DB insert source_documents failed: ${error.message}`);
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

  // Representation artifact upload targets. We provision by source capability
  // (superuser runtime policy) so callbacks can carry multiple parser artifacts.
  const doclingArtifactSourceTypes = new Set(runtimePolicy.upload.parser_artifact_source_types.docling);
  const pandocArtifactSourceTypes = new Set(runtimePolicy.upload.parser_artifact_source_types.pandoc);

  let docling_output: SignedUploadTarget | null = null;
  let html_output: SignedUploadTarget | null = null;
  let doctags_output: SignedUploadTarget | null = null;
  if (doclingArtifactSourceTypes.has(source_type)) {
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

    const html_key = `converted/${source_uid}/${basenameNoExt(originalFilename)}.html`;
    const { data: htmlUpload, error: htmlErr } = await (supabaseAdmin.storage as any)
      .from(bucket)
      .createSignedUploadUrl(html_key);
    if (htmlErr || !htmlUpload?.signedUrl) {
      throw new Error(`Create signed upload URL for html failed: ${htmlErr?.message ?? "unknown"}`);
    }
    html_output = {
      bucket,
      key: html_key,
      signed_upload_url: htmlUpload.signedUrl,
      token: htmlUpload.token ?? null,
    };

    const doctags_key = `converted/${source_uid}/${basenameNoExt(originalFilename)}.doctags`;
    const { data: doctagsUpload, error: doctagsErr } = await (supabaseAdmin.storage as any)
      .from(bucket)
      .createSignedUploadUrl(doctags_key);
    if (doctagsErr || !doctagsUpload?.signedUrl) {
      throw new Error(`Create signed upload URL for doctags failed: ${doctagsErr?.message ?? "unknown"}`);
    }
    doctags_output = {
      bucket,
      key: doctags_key,
      signed_upload_url: doctagsUpload.signedUrl,
      token: doctagsUpload.token ?? null,
    };
  }
  let pandoc_output: SignedUploadTarget | null = null;
  if (pandocArtifactSourceTypes.has(source_type)) {
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
        html_output,
        doctags_output,
        callback_url,
      }),
    });
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    await supabaseAdmin
      .from("source_documents")
      .update({ status: "conversion_failed", error: `conversion service unreachable: ${msg}`.slice(0, 1000) })
      .eq("source_uid", source_uid);
    return { status: 502, body: { source_uid, conv_uid: null, status: "conversion_failed", error: `conversion service unreachable: ${msg}` } };
  }

  if (!convertResp.ok) {
    const msg = await convertResp.text().catch(() => "");
    await supabaseAdmin
      .from("source_documents")
      .update({ status: "conversion_failed", error: `conversion request failed: HTTP ${convertResp.status} ${msg}`.slice(0, 1000) })
      .eq("source_uid", source_uid);
    return { status: 502, body: { source_uid, conv_uid: null, status: "conversion_failed", error: "conversion request failed" } };
  }

  return { status: 202, body: { source_uid, conv_uid: null, status: "converting" } };
}
