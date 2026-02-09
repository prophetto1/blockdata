import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { concatBytes, sha256Hex } from "../_shared/hash.ts";
import { extractBlocks } from "../_shared/markdown.ts";
import { extractDoclingBlocks } from "../_shared/docling.ts";
import { createAdminClient } from "../_shared/supabase.ts";

type ConversionCompleteBody = {
  source_uid: string;
  conversion_job_id: string;
  md_key: string;
  docling_key?: string | null;
  success: boolean;
  error?: string | null;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

async function readJson<T>(req: Request): Promise<T> {
  const text = await req.text();
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Invalid JSON body: ${e instanceof Error ? e.message : String(e)}`);
  }
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const expectedKey = requireEnv("CONVERSION_SERVICE_KEY");
  const gotKey = req.headers.get("X-Conversion-Service-Key");
  if (!gotKey || gotKey !== expectedKey) return json(401, { error: "Unauthorized" });

  try {
    const body = await readJson<ConversionCompleteBody>(req);
    const source_uid = (body.source_uid || "").trim();
    const conversion_job_id = (body.conversion_job_id || "").trim();
    const md_key = (body.md_key || "").trim();
    if (!source_uid || !conversion_job_id || !md_key) {
      return json(400, { error: "Missing source_uid, conversion_job_id, or md_key" });
    }

    const supabaseAdmin = createAdminClient();

    const { data: docRow, error: fetchErr } = await supabaseAdmin
      .from("documents_v2")
      .select(
        "source_uid, source_type, doc_title, uploaded_at, conversion_job_id, status, conv_uid",
      )
      .eq("source_uid", source_uid)
      .maybeSingle();
    if (fetchErr) throw new Error(`DB fetch documents_v2 failed: ${fetchErr.message}`);
    if (!docRow) return json(404, { error: "Document not found" });

    if (docRow.status === "ingested" && docRow.conv_uid) {
      return json(200, { ok: true, noop: true, status: "ingested", conv_uid: docRow.conv_uid });
    }

    if (docRow.conversion_job_id !== conversion_job_id) {
      return json(409, { error: "Stale conversion callback (job id mismatch)" });
    }

    if (!body.success) {
      const errMsg = (body.error || "conversion failed").toString().slice(0, 1000);
      await supabaseAdmin
        .from("documents_v2")
        .update({ status: "conversion_failed", error: errMsg })
        .eq("source_uid", source_uid);
      return json(200, { ok: false, status: "conversion_failed" });
    }

    const bucket = getEnv("DOCUMENTS_BUCKET", "documents");
    const docling_key = (body.docling_key || "").trim();

    // -----------------------------------------------------------------------
    // Branch: Docling track (docx/pdf with docling JSON available)
    // -----------------------------------------------------------------------
    if (docling_key) {
      const { data: dlDownload, error: dlErr } = await supabaseAdmin.storage
        .from(bucket)
        .download(docling_key);
      if (dlErr || !dlDownload) {
        throw new Error(`Storage download docling JSON failed: ${dlErr?.message ?? "unknown"}`);
      }

      const doclingBytes = new Uint8Array(await dlDownload.arrayBuffer());

      // conv_uid: sha256("docling\ndoclingdocument_json\n" + docling_json_bytes)
      const convPrefix = new TextEncoder().encode("docling\ndoclingdocument_json\n");
      const conv_uid = await sha256Hex(concatBytes([convPrefix, doclingBytes]));

      const extracted = extractDoclingBlocks(doclingBytes);

      const conv_total_blocks = extracted.blocks.length;
      const conv_total_characters = extracted.blocks.reduce(
        (sum, b) => sum + b.block_content.length,
        0,
      );
      const freqMap: Record<string, number> = {};
      for (const b of extracted.blocks) {
        freqMap[b.block_type] = (freqMap[b.block_type] || 0) + 1;
      }

      // Persist conv_uid and conversion metadata (blocks FK depends on conv_uid).
      {
        const { error: updErr } = await supabaseAdmin
          .from("documents_v2")
          .update({
            conv_uid,
            conv_locator: docling_key,
            conv_status: "success",
            conv_parsing_tool: "docling",
            conv_representation_type: "doclingdocument_json",
            conv_total_blocks,
            conv_block_type_freq: freqMap,
            conv_total_characters,
            status: "uploaded",
            error: null,
          })
          .eq("source_uid", source_uid);
        if (updErr) throw new Error(`DB update documents_v2 failed: ${updErr.message}`);
      }

      try {
        const blockRows = extracted.blocks.map((b, idx) => ({
          block_uid: `${conv_uid}:${idx}`,
          conv_uid,
          block_index: idx,
          block_type: b.block_type,
          block_locator: {
            type: "docling_json_pointer",
            pointer: b.pointer,
            ...(b.page_no != null ? { page_no: b.page_no } : {}),
          },
          block_content: b.block_content,
        }));

        if (blockRows.length === 0) throw new Error("No blocks extracted from docling JSON");

        const { error: insErr } = await supabaseAdmin.from("blocks_v2").insert(blockRows);
        if (insErr) throw new Error(`DB insert blocks_v2 failed: ${insErr.message}`);

        const { error: finalErr } = await supabaseAdmin
          .from("documents_v2")
          .update({ status: "ingested", error: null })
          .eq("source_uid", source_uid);
        if (finalErr) throw new Error(`DB update documents_v2 failed: ${finalErr.message}`);

        return json(200, {
          ok: true,
          status: "ingested",
          conv_uid,
          blocks_count: blockRows.length,
          track: "docling",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabaseAdmin
          .from("documents_v2")
          .update({ status: "ingest_failed", error: msg })
          .eq("source_uid", source_uid);
        return json(200, { ok: false, status: "ingest_failed", error: msg });
      }
    }

    // -----------------------------------------------------------------------
    // Fallback: mdast track (txt, or older conversions without docling JSON)
    // -----------------------------------------------------------------------
    const { data: download, error: mdDlErr } = await supabaseAdmin.storage
      .from(bucket)
      .download(md_key);
    if (mdDlErr || !download) {
      throw new Error(`Storage download failed: ${mdDlErr?.message ?? "unknown"}`);
    }

    const mdBytes = new Uint8Array(await download.arrayBuffer());
    const markdown = new TextDecoder().decode(mdBytes);

    // conv_uid: sha256("mdast\nmarkdown_bytes\n" + md_bytes)
    const convPrefix = new TextEncoder().encode("mdast\nmarkdown_bytes\n");
    const conv_uid = await sha256Hex(concatBytes([convPrefix, mdBytes]));

    const extracted = extractBlocks(markdown);

    const conv_total_blocks = extracted.blocks.length;
    const conv_total_characters = extracted.blocks.reduce(
      (sum, b) => sum + b.block_content.length,
      0,
    );
    const freqMap: Record<string, number> = {};
    for (const b of extracted.blocks) {
      freqMap[b.block_type] = (freqMap[b.block_type] || 0) + 1;
    }

    // Persist conv_uid and conversion metadata (blocks FK depends on conv_uid).
    {
      const { error: updErr } = await supabaseAdmin
        .from("documents_v2")
        .update({
          conv_uid,
          conv_locator: md_key,
          conv_status: "success",
          conv_parsing_tool: "mdast",
          conv_representation_type: "markdown_bytes",
          conv_total_blocks,
          conv_block_type_freq: freqMap,
          conv_total_characters,
          status: "uploaded",
          error: null,
        })
        .eq("source_uid", source_uid);
      if (updErr) throw new Error(`DB update documents_v2 failed: ${updErr.message}`);
    }

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

      if (blockRows.length === 0) throw new Error("No blocks extracted from markdown");

      const { error: insErr } = await supabaseAdmin.from("blocks_v2").insert(blockRows);
      if (insErr) throw new Error(`DB insert blocks_v2 failed: ${insErr.message}`);

      const { error: finalErr } = await supabaseAdmin
        .from("documents_v2")
        .update({ status: "ingested", error: null })
        .eq("source_uid", source_uid);
      if (finalErr) throw new Error(`DB update documents_v2 failed: ${finalErr.message}`);

      return json(200, {
        ok: true,
        status: "ingested",
        conv_uid,
        blocks_count: blockRows.length,
        track: "mdast",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin
        .from("documents_v2")
        .update({ status: "ingest_failed", error: msg })
        .eq("source_uid", source_uid);
      return json(200, { ok: false, status: "ingest_failed", error: msg });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(400, { error: msg });
  }
});
