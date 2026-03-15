import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type ArangoConfig,
  type ArangoOverlayRecord,
  type ArangoRunRecord,
  _resetCollectionCache,
  syncOverlaysToArango,
  syncRunToArango,
} from "../_shared/arangodb.ts";

/**
 * Focused tests for the Arango sync contracts used by runs/index.ts.
 * These verify that syncRunToArango and syncOverlaysToArango produce
 * the expected Arango API calls with correct keys and ancestry fields.
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

Deno.test("syncRunToArango is called with run_id, source_uid, conv_uid", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  const runRecord: ArangoRunRecord = {
    run_id: "run-abc",
    source_uid: "source-123",
    conv_uid: "conv-456",
    project_id: "proj-1",
    owner_id: "owner-1",
    schema_id: "schema-1",
    status: "running",
    total_blocks: 5,
    completed_blocks: 0,
    failed_blocks: 0,
    started_at: "2026-03-14T00:00:00.000Z",
    completed_at: null,
    model_config: { model: "claude-sonnet-4-6" },
  };

  await syncRunToArango(config, runRecord);

  // ensure collection + replace document = 2 calls
  assertEquals(calls.length, 2);

  const body = calls[1].body as Record<string, unknown>;
  assertEquals(body._key, "run-abc");
  assertEquals(body.run_id, "run-abc");
  assertEquals(body.source_uid, "source-123");
  assertEquals(body.conv_uid, "conv-456");
  assertEquals(body.total_blocks, 5);
});

Deno.test("syncOverlaysToArango is called with rows that include overlay_uid", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  const overlays: ArangoOverlayRecord[] = [
    {
      overlay_uid: "ov-1",
      run_id: "run-abc",
      source_uid: "source-123",
      conv_uid: "conv-456",
      project_id: "proj-1",
      owner_id: "owner-1",
      block_uid: "conv-456:0",
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
    {
      overlay_uid: "ov-2",
      run_id: "run-abc",
      source_uid: "source-123",
      conv_uid: "conv-456",
      project_id: "proj-1",
      owner_id: "owner-1",
      block_uid: "conv-456:1",
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
  ];

  await syncOverlaysToArango(config, overlays);

  assertEquals(calls.length, 2);

  const body = calls[1].body as Array<Record<string, unknown>>;
  assertEquals(body.length, 2);
  assertEquals(body[0]._key, "ov-1");
  assertEquals(body[0].overlay_uid, "ov-1");
  assertEquals(body[0].run_id, "run-abc");
  assertEquals(body[0].source_uid, "source-123");
  assertEquals(body[1]._key, "ov-2");
  assertEquals(body[1].block_uid, "conv-456:1");
});
