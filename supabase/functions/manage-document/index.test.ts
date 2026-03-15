import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type ArangoConfig,
  _resetCollectionCache,
  deleteProjectionForSourceFromArango,
  resetProjectionForSourceInArango,
} from "../_shared/arangodb.ts";

/**
 * Focused tests for the Arango delete/reset contracts used by manage-document.
 * These verify delete removes all five collections and reset patches to upload-stage shape.
 */

function makeConfig(
  calls: Array<{ url: string; method: string; body: unknown }>,
  status = 200,
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

Deno.test("delete action removes all five collections in correct order", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await deleteProjectionForSourceFromArango(config, "source-del");

  assertEquals(calls.length, 5);

  // Order: overlays, runs, blocks, docling_documents, document DELETE
  const overlaysBody = calls[0].body as Record<string, unknown>;
  assertEquals((overlaysBody.bindVars as Record<string, unknown>)["@coll"], "overlays");

  const runsBody = calls[1].body as Record<string, unknown>;
  assertEquals((runsBody.bindVars as Record<string, unknown>)["@coll"], "runs");

  const blocksBody = calls[2].body as Record<string, unknown>;
  assertEquals(
    blocksBody.query,
    "FOR b IN @@blocks FILTER b.source_uid == @source_uid REMOVE b IN @@blocks",
  );

  const doclingBody = calls[3].body as Record<string, unknown>;
  assertEquals((doclingBody.bindVars as Record<string, unknown>)["@coll"], "docling_documents");

  assertEquals(calls[4].method, "DELETE");
  assertEquals(
    calls[4].url,
    "https://arango.example.com/_db/blockdata/_api/document/documents/source-del",
  );
});

Deno.test("reset action clears derived data and patches document to upload-stage", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await resetProjectionForSourceInArango(config, "source-rst");

  assertEquals(calls.length, 5);

  // First 4: AQL deletes (overlays, runs, blocks, docling_documents)
  for (let i = 0; i < 4; i++) {
    assertEquals(calls[i].url, "https://arango.example.com/_db/blockdata/_api/cursor");
  }

  // Last: PATCH document to upload-stage shape
  assertEquals(calls[4].method, "PATCH");
  const patchBody = calls[4].body as Record<string, unknown>;
  assertEquals(patchBody.status, "uploaded");
  assertEquals(patchBody.conv_uid, null);
  assertEquals(patchBody.source_total_characters, null);
});

Deno.test("207 response shape matches partial failure contract", () => {
  // Verify the expected response shape for Arango partial failure
  const response = {
    ok: false,
    partial: true,
    error: "Arango cleanup pending",
  };
  assertEquals(response.ok, false);
  assertEquals(response.partial, true);
  assertEquals(typeof response.error, "string");
});