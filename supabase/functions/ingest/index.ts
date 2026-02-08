import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { concatBytes, sha256Hex } from "../_shared/hash.ts";
import { extractBlocks } from "../_shared/markdown.ts";
import { basenameNoExt, sanitizeFilename } from "../_shared/sanitize.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";

type IngestResponse = {
  source_uid: string;
  conv_uid: string | null;
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

function detectSourceType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".pptx")) return "pptx";
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

    // Idempotency: if this user already has a documents_v2 row for the same source_uid, return it.
    // If another user owns that source_uid, return 409 (global PK constraint).
    {
      const { data: existing, error } = await supabaseAdmin
        .from("documents_v2")
        .select("source_uid, owner_id, conv_uid, status, error")
        .eq("source_uid", source_uid)
        .maybeSingle();
      if (error) throw new Error(`DB lookup documents_v2 failed: ${error.message}`);
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
          conv_uid: existing.conv_uid ?? null,
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

      // v2 conv_uid: sha256(conv_parsing_tool + "\n" + conv_representation_type + "\n" + conv_representation_bytes)
      const convPrefix = new TextEncoder().encode("mdast\nmarkdown_bytes\n");
      const conv_uid = await sha256Hex(concatBytes([convPrefix, fileBytes]));

      const extracted = extractBlocks(markdown);
      const fallbackTitle = basenameNoExt(originalFilename);
      const doc_title = requestedTitle || extracted.docTitle || fallbackTitle;

      // Compute conv_* summary fields
      const conv_total_blocks = extracted.blocks.length;
      const conv_total_characters = extracted.blocks.reduce(
        (sum, b) => sum + b.block_content.length,
        0,
      );
      const freqMap: Record<string, number> = {};
      for (const b of extracted.blocks) {
        freqMap[b.block_type] = (freqMap[b.block_type] || 0) + 1;
      }

      // Insert documents_v2 row (conv_uid needed for blocks FK).
      {
        const { error } = await supabaseAdmin.from("documents_v2").insert({
          source_uid,
          owner_id: ownerId,
          source_type,
          source_filesize: fileBytes.byteLength,
          source_total_characters: markdown.length,
          source_locator: source_key,
          doc_title,
          conv_uid,
          conv_status: "success",
          conv_parsing_tool: "mdast",
          conv_representation_type: "markdown_bytes",
          conv_total_blocks,
          conv_block_type_freq: freqMap,
          conv_total_characters,
          conv_locator: source_key,
          status: "uploaded",
          conversion_job_id: null,
          error: null,
        });
        if (error) throw new Error(`DB insert documents_v2 failed: ${error.message}`);
      }

      // Insert blocks_v2.
      try {
        const blockRows = extracted.blocks.map((b, idx) => ({
          block_uid: `${conv_uid}:${idx}`,
          conv_uid,
          block_index: idx,
          block_type: b.block_type,
          block_locator: {
            type: "text_offset_range",
            start_offset: b.start_offset,
            end_offset: b.end_offset,
          },
          block_content: b.block_content,
        }));

        if (blockRows.length === 0) {
          throw new Error("No blocks extracted from markdown");
        }

        const { error } = await supabaseAdmin.from("blocks_v2").insert(blockRows);
        if (error) throw new Error(`DB insert blocks_v2 failed: ${error.message}`);

        const { error: updErr } = await supabaseAdmin
          .from("documents_v2")
          .update({ status: "ingested", error: null })
          .eq("source_uid", source_uid);
        if (updErr) throw new Error(`DB update documents_v2 failed: ${updErr.message}`);

        const resp: IngestResponse = {
          source_uid,
          conv_uid,
          status: "ingested",
          blocks_count: blockRows.length,
        };
        return json(200, resp);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabaseAdmin
          .from("documents_v2")
          .update({ status: "ingest_failed", error: msg })
          .eq("source_uid", source_uid);
        return json(500, { source_uid, conv_uid, status: "ingest_failed", error: msg });
      }
    }

    // Non-markdown: create documents_v2 row first, then call Python conversion service.
    const conversion_job_id = crypto.randomUUID();
    const fallbackTitle = basenameNoExt(originalFilename);
    const doc_title = requestedTitle || fallbackTitle;

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
        status: "converting",
        conversion_job_id,
        error: null,
      });
      if (error) throw new Error(`DB insert documents_v2 failed: ${error.message}`);
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

    // Always use the project base URL for callbacks.
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
        .from("documents_v2")
        .update({
          status: "conversion_failed",
          error: `conversion request failed: HTTP ${convertResp.status} ${msg}`.slice(0, 1000),
        })
        .eq("source_uid", source_uid);
      const resp: IngestResponse = {
        source_uid,
        conv_uid: null,
        status: "conversion_failed",
        error: "conversion request failed",
      };
      return json(502, resp);
    }

    const resp: IngestResponse = {
      source_uid,
      conv_uid: null,
      status: "converting",
    };
    return json(202, resp);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(400, { error: msg });
  }
});
