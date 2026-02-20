import { concatBytes, sha256Hex } from "../_shared/hash.ts";
import { extractBlocks } from "../_shared/markdown.ts";
import { insertRepresentationArtifact } from "../_shared/representation.ts";
import { basenameNoExt } from "../_shared/sanitize.ts";
import type { IngestContext, IngestResponse } from "./types.ts";

/**
 * Process a markdown file: extract blocks via mdast, insert doc + blocks.
 */
export async function processMarkdown(ctx: IngestContext): Promise<IngestResponse> {
  const { supabaseAdmin, source_uid, source_type, source_key, fileBytes, originalFilename, requestedTitle, project_id, ownerId } = ctx;

  const markdown = new TextDecoder().decode(fileBytes);

  // conv_uid: sha256(tool + "\n" + rep_type + "\n" + rep_bytes)
  const convPrefix = new TextEncoder().encode("mdast\nmarkdown_bytes\n");
  const conv_uid = await sha256Hex(concatBytes([convPrefix, fileBytes]));

  const extracted = extractBlocks(markdown);
  const fallbackTitle = basenameNoExt(originalFilename);
  const doc_title = requestedTitle || extracted.docTitle || fallbackTitle;

  const conv_total_blocks = extracted.blocks.length;
  const conv_total_characters = extracted.blocks.reduce((sum, b) => sum + b.block_content.length, 0);
  const freqMap: Record<string, number> = {};
  for (const b of extracted.blocks) {
    freqMap[b.block_type] = (freqMap[b.block_type] || 0) + 1;
  }

  // Insert source_documents row.
  {
    const { error } = await supabaseAdmin.from("source_documents").insert({
      source_uid,
      owner_id: ownerId,
      source_type,
      source_filesize: fileBytes.byteLength,
      source_total_characters: markdown.length,
      source_locator: source_key,
      doc_title,
      project_id,
      status: "uploaded",
      conversion_job_id: null,
      error: null,
    });
    if (error) throw new Error(`DB insert source_documents failed: ${error.message}`);
  }

  // Insert conversion_parsing row.
  {
    const { error } = await supabaseAdmin.from("conversion_parsing").insert({
      conv_uid,
      source_uid,
      conv_status: "success",
      conv_parsing_tool: "mdast",
      conv_representation_type: "markdown_bytes",
      conv_total_blocks,
      conv_block_type_freq: freqMap,
      conv_total_characters,
      conv_locator: source_key,
    });
    if (error) throw new Error(`DB insert conversion_parsing failed: ${error.message}`);
  }

  // Insert blocks.
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
        parser_block_type: b.parser_block_type,
        parser_path: b.parser_path,
      },
      block_content: b.block_content,
    }));

    if (blockRows.length === 0) {
      throw new Error("No blocks extracted from markdown");
    }

    const { error } = await supabaseAdmin.from("blocks").insert(blockRows);
    if (error) throw new Error(`DB insert blocks failed: ${error.message}`);
    await insertRepresentationArtifact(supabaseAdmin, {
      source_uid,
      conv_uid,
      parsing_tool: "mdast",
      representation_type: "markdown_bytes",
      artifact_locator: source_key,
      artifact_hash: conv_uid,
      artifact_size_bytes: fileBytes.byteLength,
      artifact_meta: { source_type },
    });

    const { error: updErr } = await supabaseAdmin
      .from("source_documents")
      .update({ status: "ingested", error: null })
      .eq("source_uid", source_uid);
    if (updErr) throw new Error(`DB update source_documents failed: ${updErr.message}`);

    return { source_uid, conv_uid, status: "ingested", blocks_count: blockRows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("source_documents")
      .update({ status: "ingest_failed", error: msg })
      .eq("source_uid", source_uid);
    return { source_uid, conv_uid, status: "ingest_failed", error: msg };
  }
}
