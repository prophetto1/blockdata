import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type ArangoConfig,
  type ArangoOverlayRecord,
  _resetCollectionCache,
  syncOverlaysToArango,
} from "../_shared/arangodb.ts";

/**
 * Focused tests for the Arango sync contracts used by manage-overlays.
 * These verify the sync helpers produce correct API calls for overlay mutations.
 */

function makeConfig(
  calls: Array<{ url: string; method: string; body: unknown }>,
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
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    },
  };
}

Deno.test("confirm action syncs affected overlays with correct ancestry fields", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  const overlays: ArangoOverlayRecord[] = [
    {
      overlay_uid: "ov-1",
      run_id: "run-1",
      source_uid: "source-1",
      conv_uid: "conv-1",
      project_id: "proj-1",
      owner_id: "owner-1",
      block_uid: "conv-1:0",
      status: "confirmed",
      overlay_jsonb_staging: { field: "value" },
      overlay_jsonb_confirmed: { field: "value" },
      claimed_by: null,
      claimed_at: null,
      attempt_count: 1,
      last_error: null,
      confirmed_at: "2026-03-14T00:00:00.000Z",
      confirmed_by: "owner-1",
    },
  ];

  await syncOverlaysToArango(config, overlays);

  assertEquals(calls.length, 2); // ensure collection + replace documents
  const body = calls[1].body as Array<Record<string, unknown>>;
  assertEquals(body.length, 1);
  assertEquals(body[0]._key, "ov-1");
  assertEquals(body[0].status, "confirmed");
  assertEquals(body[0].source_uid, "source-1");
  assertEquals(body[0].conv_uid, "conv-1");
});

Deno.test("reject action syncs overlays back to pending status", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncOverlaysToArango(config, [{
    overlay_uid: "ov-2",
    run_id: "run-1",
    source_uid: "source-1",
    conv_uid: "conv-1",
    project_id: "proj-1",
    owner_id: "owner-1",
    block_uid: "conv-1:1",
    status: "pending",
    overlay_jsonb_staging: {},
    overlay_jsonb_confirmed: {},
    claimed_by: null,
    claimed_at: null,
    attempt_count: 0,
    last_error: null,
    confirmed_at: null,
    confirmed_by: null,
  }]);

  assertEquals(calls.length, 2);
  const body = calls[1].body as Array<Record<string, unknown>>;
  assertEquals(body[0].status, "pending");
});

Deno.test("update_staging action syncs overlay with updated staging jsonb", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncOverlaysToArango(config, [{
    overlay_uid: "ov-3",
    run_id: "run-1",
    source_uid: "source-1",
    conv_uid: "conv-1",
    project_id: "proj-1",
    owner_id: "owner-1",
    block_uid: "conv-1:2",
    status: "ai_complete",
    overlay_jsonb_staging: { title: "Updated Title" },
    overlay_jsonb_confirmed: {},
    claimed_by: null,
    claimed_at: null,
    attempt_count: 1,
    last_error: null,
    confirmed_at: null,
    confirmed_by: null,
  }]);

  assertEquals(calls.length, 2);
  const body = calls[1].body as Array<Record<string, unknown>>;
  assertEquals(body[0]._key, "ov-3");
  assertEquals((body[0].overlay_jsonb_staging as Record<string, unknown>).title, "Updated Title");
});

Deno.test("empty overlay array produces no Arango calls", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncOverlaysToArango(config, []);

  assertEquals(calls.length, 0);
});

Deno.test("overlay sync preserves all ancestry fields in the batch", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncOverlaysToArango(config, [
    {
      overlay_uid: "ov-a",
      run_id: "run-x",
      source_uid: "source-x",
      conv_uid: "conv-x",
      project_id: "proj-x",
      owner_id: "owner-x",
      block_uid: "conv-x:0",
      status: "ai_complete",
      overlay_jsonb_staging: {},
      overlay_jsonb_confirmed: {},
      claimed_by: null,
      claimed_at: null,
      attempt_count: 0,
      last_error: null,
      confirmed_at: null,
      confirmed_by: null,
    },
    {
      overlay_uid: "ov-b",
      run_id: "run-x",
      source_uid: "source-x",
      conv_uid: "conv-x",
      project_id: "proj-x",
      owner_id: "owner-x",
      block_uid: "conv-x:1",
      status: "ai_complete",
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
  const body = calls[1].body as Array<Record<string, unknown>>;
  assertEquals(body.length, 2);
  // Both overlays carry the same ancestry
  for (const row of body) {
    assertEquals(row.source_uid, "source-x");
    assertEquals(row.conv_uid, "conv-x");
    assertEquals(row.project_id, "proj-x");
    assertEquals(row.owner_id, "owner-x");
  }
});
