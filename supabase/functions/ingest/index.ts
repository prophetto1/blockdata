import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { concatBytes, sha256Hex, sha256HexOfString } from "../_shared/hash.ts";
import { extractBlocks } from "../_shared/markdown.ts";
import { basenameNoExt, sanitizeFilename } from "../_shared/sanitize.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";

type IngestResponse = {
  source_uid: string;
  doc_uid: string | null;
  status: string;
  blocks_count?: number;
  error?: string;
};

type SignedUploadTarget = {
  bucket: string;
  key: string;
  signed_upload_url: string;
  token: string | null;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function detectSourceType(filename: string): "md" | "docx" | "pdf" | "txt" {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".txt")) return "txt";
  throw new Error(`Unsupported file type: ${filename}`);
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

    const immutableSchemaRefRaw = form.get("immutable_schema_ref");
    const immutable_schema_ref = typeof immutableSchemaRefRaw === "string"
      ? immutableSchemaRefRaw.trim()
      : "";
    if (!immutable_schema_ref) {
      return json(400, { error: "Missing immutable_schema_ref" });
    }

    const docTitleRaw = form.get("doc_title");
    const requestedTitle = typeof docTitleRaw === "string" ? docTitleRaw.trim() : "";

    const originalFilename = sanitizeFilename(file.name || "upload");
    const source_type = detectSourceType(originalFilename);

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const sourceUidPrefix = new TextEncoder().encode(`${source_type}\n`);
    const source_uid = await sha256Hex(concatBytes([sourceUidPrefix, fileBytes]));

    const bucket = getEnv("DOCUMENTS_BUCKET", "documents");
    const source_key = `uploads/${source_uid}/${originalFilename}`;

    const supabaseAdmin = createAdminClient();

    // Idempotency + safety:
    // - If this user already has a documents row for the same source_uid, return it.
    // - If some other user owns that source_uid, do NOT leak doc_uid/status. Return 409.
    //
    // Note: With documents.source_uid as a global primary key, identical bytes cannot be
    // uploaded by multiple owners. If multi-tenant duplicates become a requirement, the
    // schema must change (e.g., per-owner document instances).
    {
      const { data: existing, error } = await supabaseAdmin
        .from("documents")
        .select("source_uid, owner_id, doc_uid, status, error")
        .eq("source_uid", source_uid)
        .maybeSingle();
      if (error) throw new Error(`DB lookup documents failed: ${error.message}`);
      if (existing) {
        if (existing.owner_id !== ownerId) {
          return json(409, {
            error:
              "This exact file content already exists under a different owner. Current schema uses source_uid as a global primary key, so identical bytes cannot be uploaded by multiple users.",
            code: "SOURCE_UID_OWNED_BY_OTHER_USER",
            source_uid,
          });
        }
        const resp: IngestResponse = {
          source_uid,
          doc_uid: existing.doc_uid ?? null,
          status: existing.status ?? "uploaded",
          error: existing.error ?? undefined,
      };
      return json(200, resp);
    }
    }

    // Upload original into Storage (service role). Safe to upsert because the key
    // is content-addressed by source_uid (different bytes => different key).
    {
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(source_key, fileBytes, {
          contentType: file.type || undefined,
          upsert: true,
        });
      if (error) throw new Error(`Storage upload failed: ${error.message}`);
    }

    if (source_type === "md") {
      const markdown = new TextDecoder().decode(fileBytes);
      const md_uid = await sha256Hex(fileBytes);
      const doc_uid = await sha256HexOfString(`${immutable_schema_ref}\n${md_uid}`);

      const extracted = extractBlocks(markdown);
      const fallbackTitle = basenameNoExt(originalFilename);
      const doc_title = requestedTitle || extracted.docTitle || fallbackTitle;

      // Insert documents row (doc_uid is required for blocks FK target).
      {
        const { error } = await supabaseAdmin.from("documents").insert({
          source_uid,
          owner_id: ownerId,
          md_uid,
          doc_uid,
          source_type,
          source_locator: source_key,
          md_locator: source_key,
          doc_title,
          immutable_schema_ref,
          status: "uploaded",
          conversion_job_id: null,
          error: null,
        });
        if (error) throw new Error(`DB insert documents failed: ${error.message}`);
      }

      // Insert blocks.
      try {
        const blockRows = await Promise.all(
          extracted.blocks.map(async (b, idx) => ({
            block_uid: await sha256HexOfString(`${doc_uid}:${idx}`),
            doc_uid,
            block_index: idx,
            block_type: b.block_type,
            section_path: b.section_path,
            char_span: [b.char_span[0], b.char_span[1]],
            content_original: b.content_original,
          })),
        );

        if (blockRows.length === 0) {
          throw new Error("No blocks extracted from markdown");
        }

        const { error } = await supabaseAdmin.from("blocks").insert(blockRows);
        if (error) throw new Error(`DB insert blocks failed: ${error.message}`);

        const { error: updErr } = await supabaseAdmin
          .from("documents")
          .update({ status: "ingested", error: null })
          .eq("source_uid", source_uid);
        if (updErr) throw new Error(`DB update documents failed: ${updErr.message}`);

        const resp: IngestResponse = {
          source_uid,
          doc_uid,
          status: "ingested",
          blocks_count: blockRows.length,
        };
        return json(200, resp);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabaseAdmin
          .from("documents")
          .update({ status: "ingest_failed", error: msg })
          .eq("source_uid", source_uid);
        return json(500, { source_uid, doc_uid, status: "ingest_failed", error: msg });
      }
    }

    // Non-markdown: create documents row first, then call Python conversion service.
    const conversion_job_id = crypto.randomUUID();
    const fallbackTitle = basenameNoExt(originalFilename);
    const doc_title = requestedTitle || fallbackTitle;

    {
      const { error } = await supabaseAdmin.from("documents").insert({
        source_uid,
        owner_id: ownerId,
        md_uid: null,
        doc_uid: null,
        source_type,
        source_locator: source_key,
        md_locator: null,
        doc_title,
        immutable_schema_ref,
        status: "converting",
        conversion_job_id,
        error: null,
      });
      if (error) throw new Error(`DB insert documents failed: ${error.message}`);
    }

    const { data: signedDownload, error: dlErr } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(source_key, 60 * 10);
    if (dlErr || !signedDownload?.signedUrl) {
      throw new Error(`Create signed download URL failed: ${dlErr?.message ?? "unknown"}`);
    }

    const md_key = `converted/${source_uid}/${basenameNoExt(originalFilename)}.md`;
    const { data: signedUpload, error: ulErr } = await (supabaseAdmin.storage as any)
      .from(bucket)
      .createSignedUploadUrl(md_key);
    if (ulErr || !signedUpload?.signedUrl) {
      throw new Error(`Create signed upload URL failed: ${ulErr?.message ?? "unknown"}`);
    }

    const enableDoclingDebugExport = getEnv("ENABLE_DOCLING_DEBUG_EXPORT", "false") === "true";
    let docling_output: SignedUploadTarget | null = null;
    if (enableDoclingDebugExport) {
      const docling_key = `converted/${source_uid}/${basenameNoExt(originalFilename)}.docling.json`;
      const { data: doclingSignedUpload, error: doclingUlErr } = await (supabaseAdmin.storage as any)
        .from(bucket)
        .createSignedUploadUrl(docling_key);
      if (doclingUlErr || !doclingSignedUpload?.signedUrl) {
        throw new Error(
          `Create signed upload URL for docling json failed: ${doclingUlErr?.message ?? "unknown"}`,
        );
      }
      docling_output = {
        bucket,
        key: docling_key,
        signed_upload_url: doclingSignedUpload.signedUrl,
        token: doclingSignedUpload.token ?? null,
      };
    }

    // Always use the project base URL for callbacks. req.url may be invoked via either:
    // - https://<project>.supabase.co/functions/v1/ingest (origin is project base)
    // - https://<project>.functions.supabase.co/ingest (origin is functions subdomain)
    //
    // Using SUPABASE_URL keeps callback stable and correct for the deployed gateway.
    const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/+$/, "");
    const callback_url = `${supabaseUrl}/functions/v1/conversion-complete`;

    const conversionServiceUrl = requireEnv("CONVERSION_SERVICE_URL").replace(/\/+$/, "");
    const conversionKey = requireEnv("CONVERSION_SERVICE_KEY");

    const convertResp = await fetch(`${conversionServiceUrl}/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conversion-Service-Key": conversionKey,
      },
      body: JSON.stringify({
        source_uid,
        conversion_job_id,
        source_type,
        source_download_url: signedDownload.signedUrl,
        output: {
          bucket,
          key: md_key,
          signed_upload_url: signedUpload.signedUrl,
          token: signedUpload.token ?? null,
        },
        docling_output,
        callback_url,
      }),
    });

    if (!convertResp.ok) {
      const msg = await convertResp.text().catch(() => "");
      await supabaseAdmin
        .from("documents")
        .update({
          status: "conversion_failed",
          error: `conversion request failed: HTTP ${convertResp.status} ${msg}`.slice(0, 1000),
        })
        .eq("source_uid", source_uid);
      const resp: IngestResponse = {
        source_uid,
        doc_uid: null,
        status: "conversion_failed",
        error: "conversion request failed",
      };
      return json(502, resp);
    }

    const resp: IngestResponse = {
      source_uid,
      doc_uid: null,
      status: "converting",
    };
    return json(202, resp);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(400, { error: msg });
  }
});
