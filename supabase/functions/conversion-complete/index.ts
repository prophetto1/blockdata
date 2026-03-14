import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import {
  loadArangoConfigFromEnv,
  syncAssetToArango,
  syncParsedDocumentToArango,
} from "../_shared/arangodb.ts";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { concatBytes, sha256Hex } from "../_shared/hash.ts";
import { extractDoclingBlocks } from "../_shared/docling.ts";
import { insertRepresentationArtifact } from "../_shared/representation.ts";
import { createAdminClient } from "../_shared/supabase.ts";

type ConversionCompleteBody = {
  source_uid: string;
  conversion_job_id: string;
  track?: "docling" | null;
  md_key: string;
  docling_key?: string | null;
  html_key?: string | null;
  doctags_key?: string | null;
  pipeline_config?: Record<string, unknown> | null;
  blocks?: CallbackDoclingBlock[] | null;
  conv_uid?: string | null;
  docling_artifact_size_bytes?: number | null;
  success: boolean;
  error?: string | null;
};

type CallbackDoclingBlock = {
  block_type: string;
  block_content: string;
  pointer: string;
  page_no: number | null;
  page_nos: number[];
  parser_block_type: string;
  parser_path: string;
};

function normalizeCallbackBlocks(raw: unknown): CallbackDoclingBlock[] {
  if (!Array.isArray(raw)) return [];
  const blocks: CallbackDoclingBlock[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.block_type !== "string" ||
      typeof row.block_content !== "string" ||
      typeof row.pointer !== "string" ||
      typeof row.parser_block_type !== "string" ||
      typeof row.parser_path !== "string"
    ) {
      continue;
    }
    const page_nos = Array.isArray(row.page_nos)
      ? row.page_nos.filter((value): value is number =>
        typeof value === "number" && Number.isFinite(value)
      )
      : [];
    blocks.push({
      block_type: row.block_type,
      block_content: row.block_content,
      pointer: row.pointer,
      page_no: typeof row.page_no === "number" && Number.isFinite(row.page_no)
        ? row.page_no
        : null,
      page_nos,
      parser_block_type: row.parser_block_type,
      parser_path: row.parser_path,
    });
  }
  return blocks;
}

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
    throw new Error(
      `Invalid JSON body: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const expectedKey = requireEnv("CONVERSION_SERVICE_KEY");
  const gotKey = req.headers.get("X-Conversion-Service-Key");
  if (!gotKey || gotKey !== expectedKey) {
    return json(401, { error: "Unauthorized" });
  }

  try {
    const body = await readJson<ConversionCompleteBody>(req);
    const source_uid = (body.source_uid || "").trim();
    const conversion_job_id = (body.conversion_job_id || "").trim();
    const md_key = (body.md_key || "").trim();
    const docling_key = (body.docling_key || "").trim();
    const html_key = (body.html_key || "").trim();
    const doctags_key = (body.doctags_key || "").trim();
    const callbackBlocks = normalizeCallbackBlocks(body.blocks);
    if (!source_uid || !conversion_job_id || !md_key) {
      return json(400, {
        error: "Missing source_uid, conversion_job_id, or md_key",
      });
    }

    const supabaseAdmin = createAdminClient();
    const bucket = getEnv("DOCUMENTS_BUCKET", "documents");

    const { data: docRow, error: fetchErr } = await supabaseAdmin
      .from("source_documents")
      .select(
        "source_uid, owner_id, project_id, source_type, source_filesize, source_total_characters, source_locator, doc_title, uploaded_at, updated_at, conversion_job_id, status, error",
      )
      .eq("source_uid", source_uid)
      .maybeSingle();
    if (fetchErr) {
      throw new Error(`DB fetch source_documents failed: ${fetchErr.message}`);
    }
    if (!docRow) return json(404, { error: "Document not found" });

    const { data: existingConv } = await supabaseAdmin
      .from("conversion_parsing")
      .select("conv_uid")
      .eq("source_uid", source_uid)
      .maybeSingle();

    if (docRow.status === "parsed" && existingConv?.conv_uid) {
      return json(200, {
        ok: true,
        noop: true,
        status: "parsed",
        conv_uid: existingConv.conv_uid,
      });
    }

    if (docRow.conversion_job_id !== conversion_job_id) {
      return json(409, {
        error: "Stale conversion callback (job id mismatch)",
      });
    }

    if (!body.success) {
      const errMsg = (body.error || "conversion failed").toString().slice(
        0,
        1000,
      );
      await supabaseAdmin
        .from("source_documents")
        .update({ status: "conversion_failed", error: errMsg })
        .eq("source_uid", source_uid);
      const arangoConfig = loadArangoConfigFromEnv();
      if (arangoConfig) {
        await syncAssetToArango(arangoConfig, {
          source_uid,
          project_id: docRow.project_id ?? null,
          owner_id: docRow.owner_id,
          source_type: docRow.source_type,
          doc_title: docRow.doc_title,
          source_locator: docRow.source_locator,
          source_filesize: docRow.source_filesize ?? null,
          source_total_characters: docRow.source_total_characters ?? null,
          status: "conversion_failed",
          conversion_job_id: docRow.conversion_job_id ?? null,
          error: errMsg,
          uploaded_at: docRow.uploaded_at ?? null,
          updated_at: docRow.updated_at ?? null,
          conv_uid: null,
          conv_locator: null,
          conv_status: "failed",
          conv_representation_type: null,
          pipeline_config: body.pipeline_config ?? {},
          block_count: null,
        });
      }
      return json(200, { ok: false, status: "conversion_failed" });
    }

    const insertSupplementalRepresentation = async (
      key: string,
      parsing_tool: "docling",
      representation_type:
        | "markdown_bytes"
        | "doclingdocument_json"
        | "html_bytes"
        | "doctags_text",
      conv_uid: string,
    ) => {
      const { data: download, error: dlErr } = await supabaseAdmin.storage
        .from(bucket)
        .download(key);
      if (dlErr || !download) {
        throw new Error(
          `Storage download ${representation_type} failed: ${
            dlErr?.message ?? "unknown"
          }`,
        );
      }
      const bytes = new Uint8Array(await download.arrayBuffer());
      const prefix = new TextEncoder().encode(
        `${parsing_tool}\n${representation_type}\n`,
      );
      const artifact_hash = await sha256Hex(concatBytes([prefix, bytes]));

      await insertRepresentationArtifact(supabaseAdmin, {
        source_uid,
        conv_uid,
        parsing_tool,
        representation_type,
        artifact_locator: key,
        artifact_hash,
        artifact_size_bytes: bytes.byteLength,
        artifact_meta: {
          source_type: docRow.source_type,
          role: "supplemental",
        },
      });
    };

    if (!docling_key) {
      // Graceful drain: in-flight legacy pandoc/mdast jobs may call back without
      // a docling_key. Mark as conversion_failed so the document can be re-parsed
      // via the now-Docling-only pipeline, but don't throw — let the callback
      // complete cleanly so the conversion service doesn't retry.
      const errMsg =
        "Missing docling_key — legacy non-Docling job; re-parse required";
      await supabaseAdmin
        .from("source_documents")
        .update({ status: "conversion_failed", error: errMsg })
        .eq("source_uid", source_uid);
      const arangoConfig = loadArangoConfigFromEnv();
      if (arangoConfig) {
        await syncAssetToArango(arangoConfig, {
          source_uid,
          project_id: docRow.project_id ?? null,
          owner_id: docRow.owner_id,
          source_type: docRow.source_type,
          doc_title: docRow.doc_title,
          source_locator: docRow.source_locator,
          source_filesize: docRow.source_filesize ?? null,
          source_total_characters: docRow.source_total_characters ?? null,
          status: "conversion_failed",
          conversion_job_id: docRow.conversion_job_id ?? null,
          error: errMsg,
          uploaded_at: docRow.uploaded_at ?? null,
          updated_at: docRow.updated_at ?? null,
          conv_uid: null,
          conv_locator: null,
          conv_status: "failed",
          conv_representation_type: null,
          pipeline_config: body.pipeline_config ?? {},
          block_count: null,
        });
      }
      return json(200, {
        ok: false,
        status: "conversion_failed",
        error: errMsg,
        drain: true,
      });
    }

    // -----------------------------------------------------------------------
    // Docling track (only track)
    // -----------------------------------------------------------------------
    let conv_uid = (body.conv_uid || "").trim();
    let doclingArtifactSizeBytes =
      typeof body.docling_artifact_size_bytes === "number" &&
        Number.isFinite(body.docling_artifact_size_bytes)
        ? body.docling_artifact_size_bytes
        : null;
    let extractedBlocks = callbackBlocks;

    if (
      !conv_uid || doclingArtifactSizeBytes == null ||
      extractedBlocks.length === 0
    ) {
      const { data: dlDownload, error: dlErr } = await supabaseAdmin.storage
        .from(bucket)
        .download(docling_key!);
      if (dlErr || !dlDownload) {
        throw new Error(
          `Storage download docling JSON failed: ${
            dlErr?.message ?? "unknown"
          }`,
        );
      }

      const doclingBytes = new Uint8Array(await dlDownload.arrayBuffer());
      const convPrefix = new TextEncoder().encode(
        "docling\ndoclingdocument_json\n",
      );
      conv_uid = await sha256Hex(concatBytes([convPrefix, doclingBytes]));
      doclingArtifactSizeBytes = doclingBytes.byteLength;
      extractedBlocks = extractDoclingBlocks(doclingBytes).blocks;
    }

    const conv_total_blocks = extractedBlocks.length;
    const conv_total_characters = extractedBlocks.reduce(
      (sum, b) => sum + b.block_content.length,
      0,
    );
    const freqMap: Record<string, number> = {};
    for (const b of extractedBlocks) {
      freqMap[b.block_type] = (freqMap[b.block_type] || 0) + 1;
    }

    {
      const { error: convInsErr } = await supabaseAdmin
        .from("conversion_parsing")
        .upsert({
          conv_uid,
          source_uid,
          conv_status: "success",
          conv_parsing_tool: "docling",
          conv_representation_type: "doclingdocument_json",
          conv_total_blocks,
          conv_block_type_freq: freqMap,
          conv_total_characters,
          conv_locator: docling_key,
          pipeline_config: body.pipeline_config ?? {},
        }, { onConflict: "source_uid" });
      if (convInsErr) {
        throw new Error(
          `DB upsert conversion_parsing failed: ${convInsErr.message}`,
        );
      }
    }

    try {
      const blockRows = extractedBlocks.map((b, idx) => ({
        block_uid: `${conv_uid}:${idx}`,
        conv_uid,
        block_index: idx,
        block_type: b.block_type,
        block_locator: {
          type: "docling_json_pointer",
          pointer: b.pointer,
          parser_block_type: b.parser_block_type,
          parser_path: b.parser_path,
          ...(b.page_no != null ? { page_no: b.page_no } : {}),
          ...(b.page_nos.length > 0 ? { page_nos: b.page_nos } : {}),
        },
        block_content: b.block_content,
      }));
      if (blockRows.length === 0) {
        throw new Error("No blocks extracted from docling JSON");
      }

      const { error: insErr } = await supabaseAdmin.from("blocks").insert(
        blockRows,
      );
      if (insErr) throw new Error(`DB insert blocks failed: ${insErr.message}`);

      await insertRepresentationArtifact(supabaseAdmin, {
        source_uid,
        conv_uid,
        parsing_tool: "docling",
        representation_type: "doclingdocument_json",
        artifact_locator: docling_key!,
        artifact_hash: conv_uid,
        artifact_size_bytes: doclingArtifactSizeBytes,
        artifact_meta: { source_type: docRow.source_type },
      });

      await insertSupplementalRepresentation(
        md_key,
        "docling",
        "markdown_bytes",
        conv_uid,
      );

      if (html_key) {
        await insertSupplementalRepresentation(
          html_key,
          "docling",
          "html_bytes",
          conv_uid,
        );
      }

      if (doctags_key) {
        await insertSupplementalRepresentation(
          doctags_key,
          "docling",
          "doctags_text",
          conv_uid,
        );
      }

      const arangoConfig = loadArangoConfigFromEnv();
      if (arangoConfig) {
        await syncParsedDocumentToArango(arangoConfig, {
          source_uid,
          project_id: docRow.project_id ?? null,
          owner_id: docRow.owner_id,
          source_type: docRow.source_type,
          doc_title: docRow.doc_title,
          source_locator: docRow.source_locator,
          source_filesize: docRow.source_filesize ?? null,
          source_total_characters: conv_total_characters,
          status: "parsed",
          conversion_job_id: docRow.conversion_job_id ?? null,
          error: null,
          uploaded_at: docRow.uploaded_at ?? null,
          updated_at: docRow.updated_at ?? null,
          conv_uid,
          conv_locator: docling_key,
          conv_status: "success",
          conv_representation_type: "doclingdocument_json",
          pipeline_config: body.pipeline_config ?? {},
          block_count: blockRows.length,
          blocks: blockRows,
        });
      }

      const { error: finalErr } = await supabaseAdmin
        .from("source_documents")
        .update({ status: "parsed", error: null })
        .eq("source_uid", source_uid);
      if (finalErr) {
        throw new Error(
          `DB update source_documents failed: ${finalErr.message}`,
        );
      }

      return json(200, {
        ok: true,
        status: "parsed",
        conv_uid,
        blocks_count: blockRows.length,
        track: "docling",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin
        .from("source_documents")
        .update({ status: "parse_failed", error: msg })
        .eq("source_uid", source_uid);
      const arangoConfig = loadArangoConfigFromEnv();
      if (arangoConfig) {
        await syncAssetToArango(arangoConfig, {
          source_uid,
          project_id: docRow.project_id ?? null,
          owner_id: docRow.owner_id,
          source_type: docRow.source_type,
          doc_title: docRow.doc_title,
          source_locator: docRow.source_locator,
          source_filesize: docRow.source_filesize ?? null,
          source_total_characters: docRow.source_total_characters ?? null,
          status: "parse_failed",
          conversion_job_id: docRow.conversion_job_id ?? null,
          error: msg,
          uploaded_at: docRow.uploaded_at ?? null,
          updated_at: docRow.updated_at ?? null,
          conv_uid,
          conv_locator: docling_key,
          conv_status: "failed",
          conv_representation_type: "doclingdocument_json",
          pipeline_config: body.pipeline_config ?? {},
          block_count: null,
        });
      }
      return json(200, { ok: false, status: "parse_failed", error: msg });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(400, { error: msg });
  }
});
