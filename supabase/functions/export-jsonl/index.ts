import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase.ts";

function text(status: number, body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: withCorsHeaders(
      { "Content-Type": "application/x-ndjson; charset=utf-8", ...headers },
    ),
  });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

type BlockView = "normalized" | "parser_native";

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function resolveBlockView(raw: string): BlockView | null {
  if (raw === "normalized" || raw === "parser_native") return raw;
  return null;
}

function parserNativeMetaFromLocator(
  locator: unknown,
): { parser_block_type: string | null; parser_path: string | null; parser_locator_type: string | null } {
  const obj = asObject(locator);
  if (!obj) {
    return { parser_block_type: null, parser_path: null, parser_locator_type: null };
  }

  const parser_block_type = typeof obj.parser_block_type === "string" ? obj.parser_block_type : null;
  const parser_path =
    typeof obj.parser_path === "string"
      ? obj.parser_path
      : typeof obj.path === "string"
        ? obj.path
        : typeof obj.pointer === "string"
          ? obj.pointer
          : null;
  const parser_locator_type = typeof obj.type === "string" ? obj.type : null;
  return { parser_block_type, parser_path, parser_locator_type };
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization header" });

  const url = new URL(req.url);
  const run_id = (url.searchParams.get("run_id") || "").trim();
  const conv_uid = (url.searchParams.get("conv_uid") || "").trim();
  const blockViewRaw = (url.searchParams.get("block_view") || "normalized").trim().toLowerCase();
  const block_view = resolveBlockView(blockViewRaw);
  if (!run_id && !conv_uid) return json(400, { error: "Missing run_id or conv_uid" });
  if (!block_view) return json(400, { error: "Invalid block_view. Expected normalized or parser_native" });

  const supabase = createUserClient(authHeader);

  let resolvedConvUid = conv_uid;
  let schemaRef: string | null = null;
  let schemaUid: string | null = null;
  const overlaysByBlockUid = new Map<string, unknown>();

  if (run_id) {
    const { data: run, error: runErr } = await supabase
      .from("runs")
      .select("run_id, conv_uid, schemas(schema_ref, schema_uid)")
      .eq("run_id", run_id)
      .maybeSingle();
    if (runErr) return json(500, { error: runErr.message });
    if (!run) return json(404, { error: "Run not found" });

    resolvedConvUid = run.conv_uid;
    const schemaJoin = Array.isArray(run.schemas) ? run.schemas[0] : run.schemas;
    schemaRef = schemaJoin?.schema_ref ?? null;
    schemaUid = schemaJoin?.schema_uid ?? null;

    const { data: overlays, error: ovErr } = await supabase
      .from("block_overlays")
      .select("block_uid, overlay_jsonb_confirmed")
      .eq("run_id", run_id)
      .eq("status", "confirmed");
    if (ovErr) return json(500, { error: ovErr.message });
    for (const o of overlays || []) {
      overlaysByBlockUid.set(o.block_uid, o.overlay_jsonb_confirmed ?? {});
    }
  }

  // Fetch conversion + source document by conv_uid
  const { data: conv, error: convErr } = await supabase
    .from("conversion_parsing")
    .select(
      "conv_uid, conv_status, conv_parsing_tool, conv_representation_type, conv_total_blocks, conv_block_type_freq, conv_total_characters, source_uid",
    )
    .eq("conv_uid", resolvedConvUid)
    .maybeSingle();
  if (convErr) return json(500, { error: convErr.message });
  if (!conv) return json(404, { error: "Conversion not found" });

  const { data: srcDoc, error: srcErr } = await supabase
    .from("source_documents")
    .select("source_uid, source_type, source_filesize, source_total_characters, uploaded_at, status")
    .eq("source_uid", conv.source_uid)
    .maybeSingle();
  if (srcErr) return json(500, { error: srcErr.message });
  if (!srcDoc) return json(404, { error: "Source document not found" });
  if (srcDoc.status !== "ingested") return json(409, { error: "Document not ingested yet" });

  const doc = { ...srcDoc, ...conv };

  // Fetch blocks from blocks
  const { data: blocks, error: blkErr } = await supabase
    .from("blocks")
    .select("block_uid, block_type, block_index, block_locator, block_content")
    .eq("conv_uid", doc.conv_uid)
    .order("block_index", { ascending: true });
  if (blkErr) return json(500, { error: blkErr.message });
  if (!blocks || blocks.length === 0) return json(404, { error: "No blocks found" });

  // Assemble v2 canonical export shape: { immutable, user_defined }
  let out = "";
  for (const b of blocks) {
    const overlayData = run_id ? (overlaysByBlockUid.get(b.block_uid) ?? null) : null;
    const parserMeta = parserNativeMetaFromLocator(b.block_locator);
    const blockTypeForView = block_view === "parser_native"
      ? (parserMeta.parser_block_type ?? b.block_type)
      : b.block_type;
    const blockLocatorForView = block_view === "parser_native"
      ? {
        type: "parser_native_view",
        parser_block_type: parserMeta.parser_block_type,
        parser_path: parserMeta.parser_path,
        parser_locator_type: parserMeta.parser_locator_type,
        source_locator: b.block_locator,
      }
      : b.block_locator;
    const record = {
      immutable: {
        source_upload: {
          source_uid: doc.source_uid,
          source_type: doc.source_type,
          source_filesize: doc.source_filesize,
          source_total_characters: doc.source_total_characters,
          source_upload_timestamp: doc.uploaded_at,
        },
        conversion: {
          conv_status: doc.conv_status,
          conv_uid: doc.conv_uid,
          conv_parsing_tool: doc.conv_parsing_tool,
          conv_representation_type: doc.conv_representation_type,
          conv_total_blocks: doc.conv_total_blocks,
          conv_block_type_freq: doc.conv_block_type_freq,
          conv_total_characters: doc.conv_total_characters,
        },
        block: {
          block_uid: b.block_uid,
          block_index: b.block_index,
          block_type: blockTypeForView,
          block_locator: blockLocatorForView,
          block_content: b.block_content,
        },
      },
      user_defined: {
        schema_ref: run_id ? schemaRef : null,
        schema_uid: run_id ? schemaUid : null,
        data: overlayData,
      },
    };
    out += JSON.stringify(record) + "\n";
  }

  return text(200, out, {
    "Content-Disposition": `attachment; filename="export-${run_id || doc.conv_uid}.jsonl"`,
  });
});
