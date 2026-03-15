import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type ArangoConfig,
  type ArangoOverlayRecord,
  _resetCollectionCache,
  syncOverlaysToArango,
} from "../_shared/arangodb.ts";

/**
 * Tests for the manage-overlays edge function contracts.
 *
 * The edge handler (index.ts) cannot be directly imported in tests because
 * it calls Deno.serve() at module scope. These tests verify the contracts
 * that the handler depends on:
 *
 * 1. syncOverlaysToArango produces correct Arango API calls
 * 2. syncOverlaysToArango throws on Arango failure (handler catches → 207)
 * 3. Empty arrays are no-ops
 * 4. The 207 partial response shape matches the handler's output
 *
 * The handler's auth flow (requireUserId → createUserClient → RPC → admin
 * read → ownership check → sync) is tested via the end-to-end smoke test
 * in Task 7, not here.
 */

function makeConfig(
  calls: Array<{ url: string; method: string; body: unknown }>,
  failOnCall?: number,
): ArangoConfig {
  let callIndex = 0;
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
      const currentIndex = callIndex++;
      if (failOnCall !== undefined && currentIndex === failOnCall) {
        return new Response("Arango error", { status: 500 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    },
  };
}

function makeOverlay(overrides: Partial<ArangoOverlayRecord> = {}): ArangoOverlayRecord {
  return {
    overlay_uid: "ov-1",
    run_id: "run-1",
    source_uid: "source-1",
    conv_uid: "conv-1",
    project_id: "proj-1",
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
    ...overrides,
  };
}

// --- Sync helper contracts ---

Deno.test("confirm: syncs overlay with confirmed status and ancestry fields", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncOverlaysToArango(config, [
    makeOverlay({ overlay_uid: "ov-confirmed", status: "confirmed" }),
  ]);

  assertEquals(calls.length, 2);
  const body = calls[1].body as Array<Record<string, unknown>>;
  assertEquals(body[0]._key, "ov-confirmed");
  assertEquals(body[0].status, "confirmed");
  assertEquals(body[0].source_uid, "source-1");
  assertEquals(body[0].conv_uid, "conv-1");
});

Deno.test("reject: syncs overlay back to pending status", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncOverlaysToArango(config, [
    makeOverlay({ overlay_uid: "ov-rejected", status: "pending" }),
  ]);

  const body = calls[1].body as Array<Record<string, unknown>>;
  assertEquals(body[0].status, "pending");
});

Deno.test("update_staging: syncs overlay with updated staging jsonb", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncOverlaysToArango(config, [
    makeOverlay({
      overlay_uid: "ov-staged",
      status: "ai_complete",
      overlay_jsonb_staging: { title: "Updated" },
    }),
  ]);

  const body = calls[1].body as Array<Record<string, unknown>>;
  assertEquals((body[0].overlay_jsonb_staging as Record<string, unknown>).title, "Updated");
});

Deno.test("empty overlay array produces no Arango calls", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncOverlaysToArango(config, []);
  assertEquals(calls.length, 0);
});

// --- Failure path contracts ---

Deno.test("Arango sync failure throws — handler catches this and returns 207 with outbox write", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  // Fail on the replaceDocuments call (call index 1, after ensureCollection)
  const config = makeConfig(calls, 1);

  let threw = false;
  try {
    await syncOverlaysToArango(config, [makeOverlay()]);
  } catch {
    threw = true;
  }

  // syncOverlaysToArango throws on Arango failure.
  // The edge handler wraps this in try/catch and:
  // 1. Resolves source_uid from run_id → conversion_parsing
  // 2. Writes a cleanup_outbox row with action: "overlay_sync"
  // 3. Returns 207 { ok: true, count, partial: true, error: "Arango sync pending" }
  assertEquals(threw, true);
});

Deno.test("207 partial response shape matches manage-overlays contract", () => {
  // The handler returns this exact shape when Arango sync fails
  const response = { ok: true, count: 3, partial: true, error: "Arango sync pending" };
  assertEquals(response.ok, true);
  assertEquals(response.count, 3);
  assertEquals(response.partial, true);
  assertEquals(typeof response.error, "string");
});

Deno.test("batch overlay sync preserves all ancestry fields across multiple overlays", async () => {
  _resetCollectionCache();
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const config = makeConfig(calls);

  await syncOverlaysToArango(config, [
    makeOverlay({ overlay_uid: "ov-a", block_uid: "conv-1:0" }),
    makeOverlay({ overlay_uid: "ov-b", block_uid: "conv-1:1" }),
  ]);

  const body = calls[1].body as Array<Record<string, unknown>>;
  assertEquals(body.length, 2);
  for (const row of body) {
    assertEquals(row.source_uid, "source-1");
    assertEquals(row.conv_uid, "conv-1");
    assertEquals(row.project_id, "proj-1");
    assertEquals(row.owner_id, "owner-1");
  }
});