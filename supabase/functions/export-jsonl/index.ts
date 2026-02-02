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
  const doc_uid = (url.searchParams.get("doc_uid") || "").trim();
  if (!run_id && !doc_uid) return json(400, { error: "Missing run_id or doc_uid" });

  const supabase = createUserClient(authHeader);

  let resolvedDocUid = doc_uid;
  let annotationSchemaRef: string | null = null;
  let annotationSchemaUid: string | null = null;
  const annotationsByBlockUid = new Map<string, unknown>();

  if (run_id) {
    const { data: run, error: runErr } = await supabase
      .from("annotation_runs")
      .select("run_id, doc_uid, schemas(schema_ref, schema_uid)")
      .eq("run_id", run_id)
      .maybeSingle();
    if (runErr) return json(500, { error: runErr.message });
    if (!run) return json(404, { error: "Run not found" });

    resolvedDocUid = run.doc_uid;
    annotationSchemaRef = run.schemas?.schema_ref ?? null;
    annotationSchemaUid = run.schemas?.schema_uid ?? null;

    const { data: anns, error: annErr } = await supabase
      .from("block_annotations")
      .select("block_uid, annotation_jsonb")
      .eq("run_id", run_id);
    if (annErr) return json(500, { error: annErr.message });
    for (const a of anns || []) {
      annotationsByBlockUid.set(a.block_uid, a.annotation_jsonb ?? {});
    }
  }

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select(
      "doc_uid, source_uid, md_uid, source_type, source_locator, md_locator, doc_title, uploaded_at, immutable_schema_ref, status",
    )
    .eq("doc_uid", resolvedDocUid)
    .maybeSingle();
  if (docErr) return json(500, { error: docErr.message });
  if (!doc) return json(404, { error: "Document not found" });
  if (doc.status !== "ingested") return json(409, { error: "Document not ingested yet" });

  const { data: blocks, error: blkErr } = await supabase
    .from("blocks")
    .select("block_uid, block_type, block_index, section_path, char_span, content_original")
    .eq("doc_uid", doc.doc_uid)
    .order("block_index", { ascending: true });
  if (blkErr) return json(500, { error: blkErr.message });
  if (!blocks || blocks.length === 0) return json(404, { error: "No blocks found" });

  let out = "";
  for (const b of blocks) {
    const annotationData = run_id ? (annotationsByBlockUid.get(b.block_uid) ?? {}) : {};
    const record = {
      immutable: {
        immutable_schema_ref: doc.immutable_schema_ref,
        envelope: {
          doc_uid: doc.doc_uid,
          source_uid: doc.source_uid,
          md_uid: doc.md_uid,
          source_type: doc.source_type,
          source_locator: doc.source_locator,
          md_locator: doc.md_locator,
          doc_title: doc.doc_title,
          uploaded_at: doc.uploaded_at,
          block_uid: b.block_uid,
          block_type: b.block_type,
          block_index: b.block_index,
          section_path: b.section_path,
          char_span: b.char_span,
        },
        content: { original: b.content_original },
      },
      annotation: {
        schema_ref: run_id ? annotationSchemaRef : null,
        schema_uid: run_id ? annotationSchemaUid : null,
        data: annotationData,
      },
    };
    out += JSON.stringify(record) + "\n";
  }

  return text(200, out, {
    "Content-Disposition": `attachment; filename="export-${run_id || doc.doc_uid}.jsonl"`,
  });
});
