import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type ArangoConfig,
  loadArangoConfigFromEnv,
  syncAssetToArango,
  syncParsedDocumentToArango,
  toArangoKey,
} from "./arangodb.ts";

Deno.test("loadArangoConfigFromEnv returns null when sync is disabled", () => {
  Deno.env.delete("ARANGO_SYNC_ENABLED");
  assertEquals(loadArangoConfigFromEnv(), null);
});

Deno.test("toArangoKey preserves safe characters and rewrites unsafe ones", () => {
  assertEquals(toArangoKey("abc:12/34 hello"), "abc:12_34_hello");
});

Deno.test("syncAssetToArango upserts an uploaded asset document", async () => {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];

  const config: ArangoConfig = {
    baseUrl: "https://arango.example.com",
    database: "blockdata",
    username: "root",
    password: "secret",
    documentsCollection: "documents",
    blocksCollection: "blocks",
    fetchImpl: async (input, init) => {
      const requestInit = (init ?? {}) as globalThis.RequestInit;
      const text = typeof requestInit.body === "string" ? requestInit.body : "";
      calls.push({
        url: String(input),
        method: requestInit.method ?? "GET",
        body: text ? JSON.parse(text) : null,
      });
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    },
  };

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

Deno.test("syncParsedDocumentToArango upserts document and replaces blocks for source", async () => {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];

  const config: ArangoConfig = {
    baseUrl: "https://arango.example.com",
    database: "blockdata",
    username: "root",
    password: "secret",
    documentsCollection: "documents",
    blocksCollection: "blocks",
    fetchImpl: async (input, init) => {
      const requestInit = (init ?? {}) as globalThis.RequestInit;
      const text = typeof requestInit.body === "string" ? requestInit.body : "";
      calls.push({
        url: String(input),
        method: requestInit.method ?? "GET",
        body: text ? JSON.parse(text) : null,
      });
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    },
  };

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
  assertEquals(
    calls[0].url,
    "https://arango.example.com/_db/blockdata/_api/collection",
  );
  assertEquals(
    calls[1].url,
    "https://arango.example.com/_db/blockdata/_api/collection",
  );
  assertEquals(
    calls[2].url,
    "https://arango.example.com/_db/blockdata/_api/document/documents?overwriteMode=replace",
  );
  assertEquals(
    calls[3].url,
    "https://arango.example.com/_db/blockdata/_api/cursor",
  );
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
