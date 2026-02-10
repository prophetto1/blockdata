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

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization header" });

  const url = new URL(req.url);
  const run_id = (url.searchParams.get("run_id") || "").trim();
  const conv_uid = (url.searchParams.get("conv_uid") || "").trim();
  if (!run_id && !conv_uid) return json(400, { error: "Missing run_id or conv_uid" });

  const supabase = createUserClient(authHeader);

  let resolvedConvUid = conv_uid;
  let schemaRef: string | null = null;
  let schemaUid: string | null = null;
  const overlaysByBlockUid = new Map<string, unknown>();

  if (run_id) {
    const { data: run, error: runErr } = await supabase
      .from("runs_v2")
      .select("run_id, conv_uid, schemas(schema_ref, schema_uid)")
      .eq("run_id", run_id)
      .maybeSingle();
    if (runErr) return json(500, { error: runErr.message });
    if (!run) return json(404, { error: "Run not found" });

    resolvedConvUid = run.conv_uid;
    schemaRef = run.schemas?.schema_ref ?? null;
    schemaUid = run.schemas?.schema_uid ?? null;

    const { data: overlays, error: ovErr } = await supabase
      .from("block_overlays_v2")
      .select("block_uid, overlay_jsonb_confirmed")
      .eq("run_id", run_id);
    if (ovErr) return json(500, { error: ovErr.message });
    for (const o of overlays || []) {
      overlaysByBlockUid.set(o.block_uid, o.overlay_jsonb_confirmed ?? {});
    }
  }

  // Fetch document from documents_v2 by conv_uid
  const { data: doc, error: docErr } = await supabase
    .from("documents_v2")
    .select(
      "source_uid, source_type, source_filesize, source_total_characters, uploaded_at, conv_uid, conv_status, conv_parsing_tool, conv_representation_type, conv_total_blocks, conv_block_type_freq, conv_total_characters, status",
    )
    .eq("conv_uid", resolvedConvUid)
    .maybeSingle();
  if (docErr) return json(500, { error: docErr.message });
  if (!doc) return json(404, { error: "Document not found" });
  if (doc.status !== "ingested") return json(409, { error: "Document not ingested yet" });

  // Fetch blocks from blocks_v2
  const { data: blocks, error: blkErr } = await supabase
    .from("blocks_v2")
    .select("block_uid, block_type, block_index, block_locator, block_content")
    .eq("conv_uid", doc.conv_uid)
    .order("block_index", { ascending: true });
  if (blkErr) return json(500, { error: blkErr.message });
  if (!blocks || blocks.length === 0) return json(404, { error: "No blocks found" });

  // Assemble v2 canonical export shape: { immutable, user_defined }
  let out = "";
  for (const b of blocks) {
    const overlayData = run_id ? (overlaysByBlockUid.get(b.block_uid) ?? {}) : {};
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
          block_type: b.block_type,
          block_locator: b.block_locator,
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
