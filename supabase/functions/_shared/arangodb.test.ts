import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type ArangoConfig,
  _resetCollectionCache,
  deleteProjectionForSourceFromArango,
  loadArangoConfigFromEnv,
  resetProjectionForSourceInArango,
  syncAssetToArango,
  syncDoclingDocumentToArango,
  syncOverlaysToArango,
  syncParsedDocumentToArango,
  syncRunToArango,
  toArangoKey,
} from "./arangodb.ts";

// --- Shared test config factory ---

function makeConfig(
  calls: Array<{ url: string; method: string; body: unknown }>,
  status = 201,
): ArangoConfig {
  return {
    baseUrl: "https://arango.example.com",
    database: "blockdata",
    username: "root",
    password: "secret",
    documentsCollection: "documents",
    blocksCollection: "blocks",
    doclingDocumentsCollection: "docling_documents",
    runsCollection: "runs",
    overlaysCollection: "overlays",
    fetchImpl: async (input, init) => {
      const requestInit = (init ?? {}) as globalThis.RequestInit;
      const text = typeof requestInit.body === "string" ? requestInit.body : "";
      calls.push({
        url: String(input),
        method: requestInit.method ?? "GET",
        body: text ? JSON.parse(text) : null,
      });
      return new Response(JSON.stringify({ ok: true }), { status });
    },
  };
}

// --- Basic tests ---

Deno.test("loadArangoConfigFromEnv returns null when sync is disabled", () => {
  Deno.env.delete("ARANGO_SYNC_ENABLED");
  assertEquals(loadArangoConfigFromEnv(), null);
});

Deno.test("toArangoKey preserves safe characters and rewrites unsafe ones", () => {
  assertEquals(toArangoKey("abc:12/34 hello"), "abc:12_34_hello");
});

// --- syncAssetToArango ---

Deno.test("syncAssetToArango upserts an uploaded asset document", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncAssetToArango(config, {
    source_uid: "source-1",
    project_id: "project-1",
    owner_id: "owner-1",
    source_type: "pdf",
    doc_title: "Quarterly Report",
    source_locator: "documents/source-1.pdf",
    source_filesize: 12345,
    source_total_characters: null,
    status: "uploaded",
    conversion_job_id: null,
    error: null,
    uploaded_at: "2026-03-14T00:00:00.000Z",
    updated_at: "2026-03-14T00:00:00.000Z",
    conv_uid: null,
    conv_locator: null,
    conv_status: null,
    conv_representation_type: null,
    pipeline_config: null,
    block_count: null,
  });

  assertEquals(calls.length, 2);
  assertEquals(
    calls[0].url,
    "https://arango.example.com/_db/blockdata/_api/collection",
  );
  assertEquals(
    calls[1].url,
    "https://arango.example.com/_db/blockdata/_api/document/documents?overwriteMode=replace",
  );

  const documentBody = calls[1].body as Record<string, unknown>;
  assertEquals(documentBody._key, "source-1");
  assertEquals(documentBody.status, "uploaded");
  assertEquals(documentBody.source_filesize, 12345);
});

// --- syncParsedDocumentToArango ---

Deno.test("syncParsedDocumentToArango upserts document and replaces blocks for source", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncParsedDocumentToArango(config, {
    source_uid: "source-1",
    project_id: "project-1",
    owner_id: "owner-1",
    source_type: "pdf",
    doc_title: "Quarterly Report",
    source_locator: "documents/source-1.pdf",
    source_filesize: 12345,
    source_total_characters: 9,
    status: "parsed",
    conversion_job_id: "job-1",
    error: null,
    uploaded_at: "2026-03-14T00:00:00.000Z",
    updated_at: "2026-03-14T01:00:00.000Z",
    conv_uid: "conv-1",
    conv_locator: "converted/source-1/report.docling.json",
    conv_status: "success",
    conv_representation_type: "doclingdocument_json",
    pipeline_config: { parser: "docling" },
    block_count: 2,
    blocks: [
      {
        block_uid: "conv-1:0",
        block_index: 0,
        block_type: "paragraph",
        block_content: "alpha",
        block_locator: { type: "docling_json_pointer", pointer: "#/texts/0" },
      },
      {
        block_uid: "conv-1:1",
        block_index: 1,
        block_type: "heading",
        block_content: "beta",
        block_locator: { type: "docling_json_pointer", pointer: "#/texts/1" },
      },
    ],
  });

  assertEquals(calls.length, 5);
  // 0: ensure blocks collection
  assertEquals(
    calls[0].url,
    "https://arango.example.com/_db/blockdata/_api/collection",
  );
  // 1: ensure documents collection
  assertEquals(
    calls[1].url,
    "https://arango.example.com/_db/blockdata/_api/collection",
  );
  // 2: replace document
  assertEquals(
    calls[2].url,
    "https://arango.example.com/_db/blockdata/_api/document/documents?overwriteMode=replace",
  );
  // 3: delete old blocks
  assertEquals(
    calls[3].url,
    "https://arango.example.com/_db/blockdata/_api/cursor",
  );
  // 4: replace new blocks
  assertEquals(
    calls[4].url,
    "https://arango.example.com/_db/blockdata/_api/document/blocks?overwriteMode=replace",
  );

  const documentBody = calls[2].body as Record<string, unknown>;
  assertEquals(documentBody._key, "source-1");
  assertEquals(documentBody.project_id, "project-1");
  assertEquals(documentBody.block_count, 2);
  assertEquals(documentBody.status, "parsed");
  assertEquals(documentBody.conv_uid, "conv-1");

  const deleteBody = calls[3].body as Record<string, unknown>;
  assertEquals(
    deleteBody.query,
    "FOR b IN @@blocks FILTER b.source_uid == @source_uid REMOVE b IN @@blocks",
  );

  const blocksBody = calls[4].body as Array<Record<string, unknown>>;
  assertEquals(blocksBody.length, 2);
  assertEquals(blocksBody[0]._key, "source-1:0");
  assertEquals(blocksBody[0].source_uid, "source-1");
  assertEquals(blocksBody[1].block_uid, "conv-1:1");
});

// --- syncDoclingDocumentToArango ---

Deno.test("syncDoclingDocumentToArango writes a docling document keyed by conv_uid", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncDoclingDocumentToArango(config, {
    source_uid: "source-1",
    conv_uid: "conv-1",
    project_id: "project-1",
    owner_id: "owner-1",
    doc_title: "Report",
    source_type: "pdf",
    source_locator: "documents/source-1.pdf",
    conv_locator: "converted/source-1/report.docling.json",
    docling_document_json: { name: "test-doc", pages: [] },
  });

  assertEquals(calls.length, 2);
  assertEquals(
    calls[0].url,
    "https://arango.example.com/_db/blockdata/_api/collection",
  );
  assertEquals(
    calls[1].url,
    "https://arango.example.com/_db/blockdata/_api/document/docling_documents?overwriteMode=replace",
  );

  const body = calls[1].body as Record<string, unknown>;
  assertEquals(body._key, "conv-1");
  assertEquals(body.source_uid, "source-1");
  assertEquals((body.docling_document_json as Record<string, unknown>).name, "test-doc");
});

// --- syncRunToArango ---

Deno.test("syncRunToArango writes a run row keyed by run_id", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncRunToArango(config, {
    run_id: "run-1",
    source_uid: "source-1",
    conv_uid: "conv-1",
    project_id: "project-1",
    owner_id: "owner-1",
    schema_id: "schema-1",
    status: "running",
    total_blocks: 10,
    completed_blocks: 0,
    failed_blocks: 0,
    started_at: "2026-03-14T00:00:00.000Z",
    completed_at: null,
    model_config: null,
  });

  assertEquals(calls.length, 2);
  assertEquals(
    calls[1].url,
    "https://arango.example.com/_db/blockdata/_api/document/runs?overwriteMode=replace",
  );

  const body = calls[1].body as Record<string, unknown>;
  assertEquals(body._key, "run-1");
  assertEquals(body.source_uid, "source-1");
  assertEquals(body.conv_uid, "conv-1");
  assertEquals(body.total_blocks, 10);
});

// --- syncOverlaysToArango ---

Deno.test("syncOverlaysToArango batch writes overlay rows keyed by overlay_uid", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncOverlaysToArango(config, [
    {
      overlay_uid: "ov-1",
      run_id: "run-1",
      source_uid: "source-1",
      conv_uid: "conv-1",
      project_id: "project-1",
      owner_id: "owner-1",
      block_uid: "conv-1:0",
      status: "pending",
      overlay_jsonb_staging: {},
      overlay_jsonb_confirmed: {},
      claimed_by: null,
      claimed_at: null,
      attempt_count: 0,
      last_error: null,
      confirmed_at: null,
      confirmed_by: null,
    },
  ]);

  assertEquals(calls.length, 2);
  assertEquals(
    calls[1].url,
    "https://arango.example.com/_db/blockdata/_api/document/overlays?overwriteMode=replace",
  );

  const body = calls[1].body as Array<Record<string, unknown>>;
  assertEquals(body.length, 1);
  assertEquals(body[0]._key, "ov-1");
  assertEquals(body[0].run_id, "run-1");
  assertEquals(body[0].block_uid, "conv-1:0");
});

// --- deleteProjectionForSourceFromArango (five collections) ---

Deno.test("deleteProjectionForSourceFromArango removes all five collections in correct order", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls, 200);

  await deleteProjectionForSourceFromArango(config, "source-1");

  // 5 calls: overlays AQL, runs AQL, blocks AQL, docling_documents AQL, documents DELETE
  assertEquals(calls.length, 5);

  // 0: delete overlays by source_uid (AQL)
  assertEquals(calls[0].url, "https://arango.example.com/_db/blockdata/_api/cursor");
  const overlaysBody = calls[0].body as Record<string, unknown>;
  assertEquals(
    overlaysBody.query,
    "FOR d IN @@coll FILTER d.source_uid == @source_uid REMOVE d IN @@coll",
  );
  assertEquals((overlaysBody.bindVars as Record<string, unknown>)["@coll"], "overlays");

  // 1: delete runs by source_uid (AQL)
  assertEquals(calls[1].url, "https://arango.example.com/_db/blockdata/_api/cursor");
  const runsBody = calls[1].body as Record<string, unknown>;
  assertEquals((runsBody.bindVars as Record<string, unknown>)["@coll"], "runs");

  // 2: delete blocks by source_uid (AQL)
  assertEquals(calls[2].url, "https://arango.example.com/_db/blockdata/_api/cursor");
  const blocksBody = calls[2].body as Record<string, unknown>;
  assertEquals(
    blocksBody.query,
    "FOR b IN @@blocks FILTER b.source_uid == @source_uid REMOVE b IN @@blocks",
  );

  // 3: delete docling_documents by source_uid (AQL)
  assertEquals(calls[3].url, "https://arango.example.com/_db/blockdata/_api/cursor");
  const doclingBody = calls[3].body as Record<string, unknown>;
  assertEquals((doclingBody.bindVars as Record<string, unknown>)["@coll"], "docling_documents");

  // 4: delete document by _key (REST DELETE)
  assertEquals(
    calls[4].url,
    "https://arango.example.com/_db/blockdata/_api/document/documents/source-1",
  );
  assertEquals(calls[4].method, "DELETE");
});

// --- resetProjectionForSourceInArango (five collections) ---

Deno.test("resetProjectionForSourceInArango removes derived data and patches document to upload-stage shape", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls, 200);

  await resetProjectionForSourceInArango(config, "source-1");

  // 5 calls: overlays AQL, runs AQL, blocks AQL, docling_documents AQL, document PATCH
  assertEquals(calls.length, 5);

  // 0-3: delete derived data (same order as delete)
  assertEquals(calls[0].url, "https://arango.example.com/_db/blockdata/_api/cursor");
  assertEquals(calls[1].url, "https://arango.example.com/_db/blockdata/_api/cursor");
  assertEquals(calls[2].url, "https://arango.example.com/_db/blockdata/_api/cursor");
  assertEquals(calls[3].url, "https://arango.example.com/_db/blockdata/_api/cursor");

  // 4: patch document to upload-stage shape
  assertEquals(
    calls[4].url,
    "https://arango.example.com/_db/blockdata/_api/document/documents/source-1",
  );
  assertEquals(calls[4].method, "PATCH");

  const patchBody = calls[4].body as Record<string, unknown>;
  assertEquals(patchBody.status, "uploaded");
  assertEquals(patchBody.conversion_job_id, null);
  assertEquals(patchBody.conv_uid, null);
  assertEquals(patchBody.conv_locator, null);
  assertEquals(patchBody.conv_status, null);
  assertEquals(patchBody.conv_representation_type, null);
  assertEquals(patchBody.pipeline_config, null);
  assertEquals(patchBody.block_count, null);
  assertEquals(patchBody.error, null);
  assertEquals(patchBody.source_total_characters, null);
});