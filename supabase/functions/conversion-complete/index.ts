import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { sha256Hex, sha256HexOfString } from "../_shared/hash.ts";
import { extractBlocks } from "../_shared/markdown.ts";
import { createAdminClient } from "../_shared/supabase.ts";

type ConversionCompleteBody = {
  source_uid: string;
  conversion_job_id: string;
  md_key: string;
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
      .from("documents")
      .select(
        "source_uid, immutable_schema_ref, doc_uid, md_uid, source_type, source_locator, md_locator, doc_title, uploaded_at, conversion_job_id, status",
      )
      .eq("source_uid", source_uid)
      .maybeSingle();
    if (fetchErr) throw new Error(`DB fetch documents failed: ${fetchErr.message}`);
    if (!docRow) return json(404, { error: "Document not found" });

    if (docRow.status === "ingested" && docRow.doc_uid) {
      return json(200, { ok: true, noop: true, status: "ingested", doc_uid: docRow.doc_uid });
    }

    if (docRow.conversion_job_id !== conversion_job_id) {
      return json(409, { error: "Stale conversion callback (job id mismatch)" });
    }

    if (!body.success) {
      const errMsg = (body.error || "conversion failed").toString().slice(0, 1000);
      await supabaseAdmin
        .from("documents")
        .update({ status: "conversion_failed", error: errMsg })
        .eq("source_uid", source_uid);
      return json(200, { ok: false, status: "conversion_failed" });
    }

    const bucket = getEnv("DOCUMENTS_BUCKET", "documents");
    const { data: download, error: dlErr } = await supabaseAdmin.storage
      .from(bucket)
      .download(md_key);
    if (dlErr || !download) throw new Error(`Storage download failed: ${dlErr?.message ?? "unknown"}`);

    const mdBytes = new Uint8Array(await download.arrayBuffer());
    const markdown = new TextDecoder().decode(mdBytes);

    const md_uid = await sha256Hex(mdBytes);
    const doc_uid = await sha256HexOfString(`${docRow.immutable_schema_ref}\n${md_uid}`);

    // Persist md_uid/doc_uid before block insert (blocks FK depends on doc_uid existing).
    {
      const { error: updErr } = await supabaseAdmin
        .from("documents")
        .update({
          md_uid,
          doc_uid,
          md_locator: md_key,
          status: "uploaded",
          error: null,
        })
        .eq("source_uid", source_uid);
      if (updErr) throw new Error(`DB update documents failed: ${updErr.message}`);
    }

    try {
      const extracted = extractBlocks(markdown);
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

      if (blockRows.length === 0) throw new Error("No blocks extracted from markdown");

      const { error: insErr } = await supabaseAdmin.from("blocks").insert(blockRows);
      if (insErr) throw new Error(`DB insert blocks failed: ${insErr.message}`);

      const { error: finalErr } = await supabaseAdmin
        .from("documents")
        .update({ status: "ingested", error: null })
        .eq("source_uid", source_uid);
      if (finalErr) throw new Error(`DB update documents failed: ${finalErr.message}`);

      return json(200, { ok: true, status: "ingested", doc_uid, blocks_count: blockRows.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin
        .from("documents")
        .update({ status: "ingest_failed", error: msg })
        .eq("source_uid", source_uid);
      return json(200, { ok: false, status: "ingest_failed", error: msg });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(400, { error: msg });
  }
});
