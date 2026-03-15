# Arango Document Lifecycle Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Arango a self-sufficient projection for current Docling-parsed documents by syncing lifecycle metadata, full `doclingdocument_json`, normalized blocks, runs, and overlays, while preserving delete/reset cleanup and reducing redundant Arango collection checks.

**Architecture:** Supabase remains the system of record. ArangoDB Cloud becomes a derived but self-contained parsed-document projection for the current Docling-only parsing track: document metadata in `blockdata_documents`, full Docling payloads in `blockdata_docling_documents`, normalized blocks in `blockdata_blocks`, run rows in `blockdata_runs`, overlay rows in `blockdata_overlays`. Two new edge functions (`manage-document`, `manage-overlays`) mediate lifecycle operations so Arango stays in sync. A `cleanup_outbox` table (already created by migration `089`) provides durable retry for partial failures.

**Tech Stack:** Supabase Edge Functions, Supabase Postgres migrations, Supabase Storage, ArangoDB Cloud, TypeScript, Deno tests

---

## Prerequisites (already landed)

The hardening pass already delivered:

- **Migration `089`:** `cleanup_outbox` table with actions `delete`, `reset`, `reparse_cleanup`
- **`arangodb.ts`:** `deleteProjectionForSourceFromArango`, `resetProjectionForSourceInArango`, `_resetCollectionCache`, `UPLOAD_STAGE_RESET_FIELDS` (documents + blocks only)
- **`trigger-parse/index.ts`:** Arango cleanup on re-parse with outbox fallback on failure
- **`arangodb.test.ts`:** 6 passing tests including delete/reset helpers

This plan extends those helpers to all five collections and wires them into the remaining lifecycle paths.

## Test Harness Pattern

All new tests in this plan use the established pattern from `arangodb.test.ts`:

- Framework: `Deno.test()` with `assertEquals` from `https://deno.land/std@0.224.0/assert/mod.ts`
- Arango mocking: inject `fetchImpl` into `ArangoConfig`, capture calls in `Array<{ url, method, body }>`
- Supabase mocking: stub object with chained `.from().select().eq()` returning test data
- Every test must call `_resetCollectionCache()` before running

## Identity Contract

- `source_uid` — source document identity
- `conv_uid` — parse-version identity
- `block_uid` — normalized block identity, format `${conv_uid}:${block_index}`
- `overlay_uid` — new first-class UUID on `block_overlays`
- `run_id` — run identity

Arango run and overlay records carry ancestry for joins:
- runs: `run_id`, `source_uid`, `conv_uid`, `project_id`
- overlays: `overlay_uid`, `run_id`, `source_uid`, `conv_uid`, `block_uid`, `project_id`

## Out of Scope

- Raw original file bytes in Arango
- Parser-agnostic document payloads beyond the current Docling-only track
- Graph edges or ArangoSearch views
- Replacing existing `source_uid`, `conv_uid`, or `block_uid` formats
- Replacing the existing `(run_id, block_uid)` composite key on `block_overlays`
- Reconciliation sweep for `cleanup_outbox` (tracked separately — the table and write paths exist, but the reader/retry loop is a separate task)

---

### Task 1: Add `overlay_uid` to the Postgres overlay model

**Files:**
- Create: `supabase/migrations/20260314170000_090_add_overlay_uid.sql`
- Modify: `web/src/lib/types.ts`

**Step 1: Write the migration**

Create `supabase/migrations/20260314170000_090_add_overlay_uid.sql`:

```sql
ALTER TABLE public.block_overlays
  ADD COLUMN overlay_uid UUID DEFAULT gen_random_uuid();

UPDATE public.block_overlays
SET overlay_uid = gen_random_uuid()
WHERE overlay_uid IS NULL;

ALTER TABLE public.block_overlays
  ALTER COLUMN overlay_uid SET NOT NULL;

CREATE UNIQUE INDEX idx_block_overlays_overlay_uid
  ON public.block_overlays (overlay_uid);
```

**Step 2: Verify ordering**

Run: `ls supabase/migrations/ | tail -5`

Expected: `090` sorts after `089_add_cleanup_outbox.sql`.

**Step 3: Update the frontend overlay type**

Add `overlay_uid` as the first field in `BlockOverlayRow` in `web/src/lib/types.ts`:

```ts
export type BlockOverlayRow = {
  overlay_uid: string;
  run_id: string;
  block_uid: string;
  // ... existing fields unchanged
};
```

**Step 4: Verify existing consumers tolerate the added column**

Confirm these all use `select('*')` or otherwise don't hard-fail on an extra column:

- `web/src/hooks/useOverlays.ts` — `select('*')` + realtime subscription
- `web/src/components/blocks/BlockViewerGridRDG.tsx` — imports `useOverlays` hook
- `supabase/functions/worker/index.ts` — 10 separate `.from("block_overlays")` query sites (admin client)
- `supabase/functions/export-jsonl/index.ts` — reads confirmed overlays (user client)
- `web/src/lib/tables.ts` — `TABLES.overlays` constant definition

No code changes should be needed.

**Step 5: Commit**

```bash
git add supabase/migrations/20260314170000_090_add_overlay_uid.sql web/src/lib/types.ts
git commit -m "feat: add overlay_uid to block_overlays"
```

---

### Task 2: Expand Arango helpers to five collections

The hardening pass added `deleteProjectionForSourceFromArango` and `resetProjectionForSourceInArango` for documents + blocks only. This task expands to all five collections and adds sync helpers for the three new record types.

**Important sequencing note:** This task adds `docling_document_json` as an **optional** field on `ArangoParsedDocument`. Task 3 will always supply it. This avoids breaking `conversion-complete` before Task 3 lands.

**Files:**
- Modify: `supabase/functions/_shared/arangodb.ts`
- Modify: `supabase/functions/_shared/arangodb.test.ts`

**Step 1: Add three new collection config fields**

Extend `ArangoConfig`:

```ts
export type ArangoConfig = {
  baseUrl: string;
  database: string;
  username: string;
  password: string;
  documentsCollection: string;
  blocksCollection: string;
  doclingDocumentsCollection: string;
  runsCollection: string;
  overlaysCollection: string;
  fetchImpl?: typeof fetch;
};
```

Update `loadArangoConfigFromEnv()` to add:

```ts
doclingDocumentsCollection: getEnv("ARANGO_DOCLING_DOCUMENTS_COLLECTION", "blockdata_docling_documents"),
runsCollection: getEnv("ARANGO_RUNS_COLLECTION", "blockdata_runs"),
overlaysCollection: getEnv("ARANGO_OVERLAYS_COLLECTION", "blockdata_overlays"),
```

**Step 2: Add the new projection types**

```ts
export type ArangoDoclingDocumentRecord = {
  source_uid: string;
  conv_uid: string;
  project_id: string | null;
  owner_id: string;
  doc_title: string;
  source_type: string;
  source_locator: string;
  conv_locator: string;
  docling_document_json: Record<string, unknown>;
};

export type ArangoRunRecord = {
  run_id: string;
  source_uid: string;
  conv_uid: string;
  project_id: string | null;
  owner_id: string;
  schema_id: string;
  status: string;
  total_blocks: number;
  completed_blocks: number;
  failed_blocks: number;
  started_at: string;
  completed_at: string | null;
  model_config: Record<string, unknown> | null;
};

export type ArangoOverlayRecord = {
  overlay_uid: string;
  run_id: string;
  source_uid: string;
  conv_uid: string;
  project_id: string | null;
  owner_id: string;
  block_uid: string;
  status: string;
  overlay_jsonb_staging: Record<string, unknown>;
  overlay_jsonb_confirmed: Record<string, unknown>;
  claimed_by: string | null;
  claimed_at: string | null;
  attempt_count: number;
  last_error: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
};
```

**Step 3: Make `docling_document_json` optional on `ArangoParsedDocument`**

```ts
export type ArangoParsedDocument = ArangoAssetDocument & {
  conv_uid: string;
  conv_locator: string;
  conv_status: string;
  conv_representation_type: string;
  docling_document_json?: Record<string, unknown>;
  blocks: ArangoBlockRecord[];
};
```

**Step 4: Write the failing tests for new sync helpers**

Add tests for:

- `syncDoclingDocumentToArango(config, record)` — writes to `doclingDocumentsCollection` keyed by `conv_uid`
- `syncRunToArango(config, run)` — writes to `runsCollection` keyed by `run_id`
- `syncOverlaysToArango(config, overlays)` — batch writes to `overlaysCollection` keyed by `overlay_uid`

Each test uses the same fetch-stub pattern from existing tests. Assert exact URLs and body shapes.

**Step 5: Run tests to verify they fail**

Run: `deno test supabase/functions/_shared/arangodb.test.ts --allow-env`

Expected: FAIL — new functions not yet exported.

**Step 6: Implement the new sync helpers**

```ts
export async function syncDoclingDocumentToArango(
  config: ArangoConfig,
  record: ArangoDoclingDocumentRecord,
): Promise<void> {
  await ensureCachedCollection(config, config.doclingDocumentsCollection);
  await replaceDocument(config, config.doclingDocumentsCollection, {
    _key: toArangoKey(record.conv_uid),
    ...record,
    synced_at: new Date().toISOString(),
  });
}

export async function syncRunToArango(
  config: ArangoConfig,
  run: ArangoRunRecord,
): Promise<void> {
  await ensureCachedCollection(config, config.runsCollection);
  await replaceDocument(config, config.runsCollection, {
    _key: toArangoKey(run.run_id),
    ...run,
    synced_at: new Date().toISOString(),
  });
}

export async function syncOverlaysToArango(
  config: ArangoConfig,
  overlays: ArangoOverlayRecord[],
): Promise<void> {
  if (overlays.length === 0) return;
  await ensureCachedCollection(config, config.overlaysCollection);
  const synced_at = new Date().toISOString();
  await replaceDocuments(
    config,
    config.overlaysCollection,
    overlays.map((o) => ({
      _key: toArangoKey(o.overlay_uid),
      ...o,
      synced_at,
    })),
  );
}
```

**Step 7: Expand delete/reset to all five collections**

Update `deleteProjectionForSourceFromArango`:

```ts
export async function deleteProjectionForSourceFromArango(
  config: ArangoConfig,
  sourceUid: string,
): Promise<void> {
  await deleteBySourceUid(config, config.overlaysCollection, sourceUid);
  await deleteBySourceUid(config, config.runsCollection, sourceUid);
  await deleteBlocksForSource(config, sourceUid);
  await deleteBySourceUid(config, config.doclingDocumentsCollection, sourceUid);
  await deleteDocument(config, config.documentsCollection, sourceUid);
}
```

Add a generic `deleteBySourceUid` helper using the same AQL pattern as `deleteBlocksForSource`:

```ts
async function deleteBySourceUid(
  config: ArangoConfig,
  collection: string,
  sourceUid: string,
): Promise<void> {
  const resp = await arangoRequest(config, "/_api/cursor", {
    method: "POST",
    body: JSON.stringify({
      query: "FOR d IN @@coll FILTER d.source_uid == @source_uid REMOVE d IN @@coll",
      bindVars: { "@coll": collection, source_uid: sourceUid },
    }),
  });
  if (resp.ok) return;
  const body = await resp.text().catch(() => "");
  throw new Error(
    `Arango deleteBySourceUid failed for ${collection}: ${resp.status} ${body.slice(0, 300)}`,
  );
}
```

Update `resetProjectionForSourceInArango` similarly — delete from all four derived collections, then patch the document row.

**Step 8: Write tests for five-collection delete/reset**

Update the existing delete/reset tests to expect calls against all five collections. Use a fetch stub that counts calls. Assert the **delete order** matches the contract: overlays first, then runs, then blocks, then docling documents, then the document row (or patch for reset). Order matters — child records must be removed before parent records.

**Step 9: Update existing tests for new config fields**

All existing test configs need the three new collection fields:

```ts
const config: ArangoConfig = {
  // ... existing fields ...
  doclingDocumentsCollection: "docling_documents",
  runsCollection: "runs",
  overlaysCollection: "overlays",
};
```

**Step 10: Run tests**

Run: `deno test supabase/functions/_shared/arangodb.test.ts --allow-env`

Expected: PASS for all tests.

**Step 11: Commit**

```bash
git add supabase/functions/_shared/arangodb.ts supabase/functions/_shared/arangodb.test.ts
git commit -m "feat: expand Arango helpers to five collections with sync, delete, and reset"
```

---

### Task 3: Sync full `doclingdocument_json` from `conversion-complete`

**The problem:** `conversion-complete/index.ts` has a fast path where the conversion service provides `conv_uid`, `blocks`, and `docling_artifact_size_bytes` in the callback — in that case, `doclingBytes` is never downloaded from Storage. But Arango needs the full JSON payload.

**The solution:** Always download `doclingBytes` before the Arango sync point. The download is a single Storage read of data already in the bucket. The cost (~200ms) is acceptable given Arango sync already adds latency, and correctness requires the payload.

**Files:**
- Modify: `supabase/functions/conversion-complete/index.ts`
- Create: `supabase/functions/conversion-complete/index.test.ts`

**Step 1: Hoist shared variables into outer scope**

Before the existing conditional block (~line 288), two things need to move or be declared at function scope:

1. `arangoConfig` — currently loaded later (~line 402). Move it earlier, before the conditional:
   ```ts
   const arangoConfig = loadArangoConfigFromEnv();
   ```

2. `doclingBytes` — currently declared inside the `if` block (~line 298) so it's not visible outside. Hoist a `let` declaration before the conditional:
   ```ts
   let doclingBytes: Uint8Array | undefined;
   ```
   Then inside the existing conditional block, change the `const doclingBytes = ...` to assign to the outer variable instead of declaring a new one.

**Step 2: Add Arango-specific Docling JSON download**

After the existing conditional block (which now assigns to the hoisted `doclingBytes`), add:

```ts
// Always fetch the raw Docling JSON for the Arango self-contained projection.
// On the fast path, conv_uid and blocks came from the callback, but Arango
// needs the full doclingdocument_json payload.
let doclingDocumentJson: Record<string, unknown> | null = null;
if (arangoConfig) {
  let rawBytes: Uint8Array;
  if (doclingBytes) {
    // Already downloaded in the slow path above.
    rawBytes = doclingBytes;
  } else {
    const { data: dlData, error: dlErr } = await supabaseAdmin.storage
      .from(bucket)
      .download(docling_key!);
    if (dlErr || !dlData) {
      console.error("conversion-complete: Docling JSON download for Arango failed:", dlErr);
      // Non-fatal for Arango — the document/blocks still sync fine.
      rawBytes = new Uint8Array(0);
    } else {
      rawBytes = new Uint8Array(await dlData.arrayBuffer());
    }
  }
  if (rawBytes.length > 0) {
    doclingDocumentJson = JSON.parse(new TextDecoder().decode(rawBytes));
  }
}
```

**Step 3: Pass the payload to `syncParsedDocumentToArango`**

Update the call at ~line 416:

```ts
await syncParsedDocumentToArango(arangoConfig, {
  source_uid,
  project_id: docRow.project_id ?? null,
  owner_id: docRow.owner_id,
  source_type: docRow.source_type,
  doc_title: docRow.doc_title,
  source_locator: docRow.source_locator,
  source_filesize: docRow.source_filesize ?? null,
  source_total_characters: conv_total_characters,
  status: "parsed",
  conversion_job_id: docRow.conversion_job_id ?? null,
  error: null,
  uploaded_at: docRow.uploaded_at ?? null,
  updated_at: docRow.updated_at ?? null,
  conv_uid,
  conv_locator: docling_key,
  conv_status: "success",
  conv_representation_type: "doclingdocument_json",
  docling_document_json: doclingDocumentJson ?? undefined,
  pipeline_config: body.pipeline_config ?? {},
  block_count: blockRows.length,
  blocks: blockRows,
});
```

**Step 4: Sync the Docling payload to its own collection**

After `syncParsedDocumentToArango`, add:

```ts
if (doclingDocumentJson) {
  await syncDoclingDocumentToArango(arangoConfig, {
    source_uid,
    conv_uid,
    project_id: docRow.project_id ?? null,
    owner_id: docRow.owner_id,
    doc_title: docRow.doc_title,
    source_type: docRow.source_type,
    source_locator: docRow.source_locator,
    conv_locator: docling_key,
    docling_document_json: doclingDocumentJson,
  });
}
```

**Step 5: Add a focused regression test**

Create `supabase/functions/conversion-complete/index.test.ts`. Test the Arango payload assembly logic in isolation — extract the payload-building into a helper if needed. Assert:

- `docling_document_json` is present when Arango sync is enabled
- `block_uid` format is `${conv_uid}:${idx}`
- `conv_uid` is preserved from the callback fast path

**Step 6: Run tests**

Run both the new test and the shared helpers:

```bash
deno test supabase/functions/conversion-complete/index.test.ts --allow-env
deno test supabase/functions/_shared/arangodb.test.ts --allow-env
```

Expected: PASS for both.

**Step 7: Commit**

```bash
git add supabase/functions/conversion-complete/index.ts supabase/functions/conversion-complete/index.test.ts
git commit -m "feat: sync full doclingdocument_json to Arango on parse completion"
```

---

### Task 4: Sync runs and initial overlays to Arango

**Files:**
- Modify: `supabase/functions/runs/index.ts`
- Create: `supabase/functions/runs/index.test.ts`

**Ancestry join path:** The `create_run` RPC returns only `run_id`. To get the fields Arango needs, query:

```ts
const { data: runRow } = await supabaseAdmin
  .from("runs")
  .select(`
    run_id,
    conv_uid,
    owner_id,
    schema_id,
    status,
    total_blocks,
    completed_blocks,
    failed_blocks,
    started_at,
    completed_at,
    model_config
  `)
  .eq("run_id", run_id)
  .single();

// Join through conversion_parsing to get source_uid and project_id
const { data: ancestry } = await supabaseAdmin
  .from("conversion_parsing")
  .select("source_uid, source_documents!inner(project_id)")
  .eq("conv_uid", runRow.conv_uid)
  .single();

const source_uid = ancestry.source_uid;
const project_id = ancestry.source_documents.project_id;
```

**Step 1: Add Arango imports to `runs/index.ts`**

```ts
import {
  loadArangoConfigFromEnv,
  syncRunToArango,
  syncOverlaysToArango,
} from "../_shared/arangodb.ts";
```

**Step 2: After the existing run creation and model_config update, fetch ancestry and sync**

Place this after the existing `total_blocks` fetch (~line 116):

```ts
const arangoConfig = loadArangoConfigFromEnv();
if (arangoConfig) {
  // Fetch the full run row
  const { data: fullRun } = await supabaseAdmin
    .from("runs")
    .select("run_id, conv_uid, owner_id, schema_id, status, total_blocks, completed_blocks, failed_blocks, started_at, completed_at, model_config")
    .eq("run_id", run_id)
    .single();

  // Resolve source_uid and project_id via conversion_parsing
  const { data: ancestry } = await supabaseAdmin
    .from("conversion_parsing")
    .select("source_uid")
    .eq("conv_uid", fullRun.conv_uid)
    .single();
  const { data: docRow } = await supabaseAdmin
    .from("source_documents")
    .select("project_id")
    .eq("source_uid", ancestry.source_uid)
    .single();

  await syncRunToArango(arangoConfig, {
    run_id: fullRun.run_id,
    source_uid: ancestry.source_uid,
    conv_uid: fullRun.conv_uid,
    project_id: docRow.project_id,
    owner_id: fullRun.owner_id,
    schema_id: fullRun.schema_id,
    status: fullRun.status,
    total_blocks: fullRun.total_blocks,
    completed_blocks: fullRun.completed_blocks,
    failed_blocks: fullRun.failed_blocks,
    started_at: fullRun.started_at,
    completed_at: fullRun.completed_at,
    model_config: fullRun.model_config,
  });

  // Fetch and sync the initial overlay rows
  const { data: overlayRows } = await supabaseAdmin
    .from("block_overlays")
    .select("overlay_uid, run_id, block_uid, status, overlay_jsonb_staging, overlay_jsonb_confirmed, claimed_by, claimed_at, attempt_count, last_error, confirmed_at, confirmed_by")
    .eq("run_id", run_id);

  if (overlayRows && overlayRows.length > 0) {
    await syncOverlaysToArango(arangoConfig, overlayRows.map((o) => ({
      ...o,
      source_uid: ancestry.source_uid,
      conv_uid: fullRun.conv_uid,
      project_id: docRow.project_id,
      owner_id: fullRun.owner_id,
    })));
  }
}
```

**Step 3: Write the failing test**

In `runs/index.test.ts`, mock the Supabase client and Arango fetch. Assert:

- `syncRunToArango` is called with `run_id`, `source_uid`, `conv_uid`
- `syncOverlaysToArango` is called with rows that include `overlay_uid`

**Step 4: Run tests**

Run: `deno test supabase/functions/runs/index.test.ts --allow-env`

Expected: PASS.

**Step 5: Commit**

```bash
git add supabase/functions/runs/index.ts supabase/functions/runs/index.test.ts
git commit -m "feat: sync runs and initial overlays to Arango"
```

---

### Task 5: Keep overlay state in Arango via batch sync in worker and a new `manage-overlays` edge function

**Design decision:** The worker processes up to 100 blocks per invocation with overlay mutations inside tight loops (6 mutation sites). Per-block Arango sync would add 30-100 round-trips and risks crashing the worker mid-batch on Arango failure. Instead: **collect touched overlay IDs during the batch, then sync once at the end.**

**Auth model for `manage-overlays`:**
1. Extract user JWT from `Authorization` header
2. Create a user-scoped client (`createUserClient(authHeader)`) for the RPC call — respects RLS and ownership
3. After RPC success, create an admin client (`createAdminClient()`) to read the affected overlay rows for Arango sync
4. Before syncing to Arango, verify `owner_id` on fetched rows matches the authenticated user

**Files:**
- Modify: `supabase/functions/worker/index.ts`
- Create: `supabase/functions/manage-overlays/index.ts`
- Create: `supabase/functions/manage-overlays/index.test.ts`
- Modify: `web/src/components/blocks/BlockViewerGridRDG.tsx`

**Step 1: Add batch overlay sync to the worker**

In `worker/index.ts`, at the top of the main handler (after `run_id` is parsed from the request body at ~line 716), initialize a set to track touched overlay IDs:

```ts
// run_id is already parsed from body above (~line 716).
// Use it directly — no separate variable needed.
const touchedBlockUids = new Set<string>();
```

At each of the 6 overlay mutation sites (lines ~841, ~860, ~1106, ~1143, ~1202, ~1272), add the mutated `block_uid`(s) to `touchedBlockUids`. Do NOT add any Arango calls inside these loops.

For example, after the overlay update at ~line 1202:
```ts
touchedBlockUids.add(blockUid);
```

And after the bulk update at ~line 841 (which uses `target` array of block_uids):
```ts
for (const uid of target) touchedBlockUids.add(uid);
```

After the batch loop completes (before the final response), add a single sync call:

```ts
// Batch Arango overlay sync — one call after all mutations, non-fatal.
// run_id comes from the request body, already parsed at ~line 716.
const arangoConfig = loadArangoConfigFromEnv();
if (arangoConfig && touchedBlockUids.size > 0 && run_id) {
  try {
    const { data: touchedOverlays } = await supabaseAdmin
      .from("block_overlays")
      .select("overlay_uid, run_id, block_uid, status, overlay_jsonb_staging, overlay_jsonb_confirmed, claimed_by, claimed_at, attempt_count, last_error, confirmed_at, confirmed_by")
      .eq("run_id", run_id)
      .in("block_uid", Array.from(touchedBlockUids));

    if (touchedOverlays && touchedOverlays.length > 0) {
      // Resolve ancestry once for the batch
      const { data: runRow } = await supabaseAdmin
        .from("runs")
        .select("conv_uid, owner_id")
        .eq("run_id", run_id)
        .single();
      const { data: ancestry } = await supabaseAdmin
        .from("conversion_parsing")
        .select("source_uid")
        .eq("conv_uid", runRow.conv_uid)
        .single();
      const { data: docRow } = await supabaseAdmin
        .from("source_documents")
        .select("project_id")
        .eq("source_uid", ancestry.source_uid)
        .single();

      await syncOverlaysToArango(arangoConfig, touchedOverlays.map((o) => ({
        ...o,
        source_uid: ancestry.source_uid,
        conv_uid: runRow.conv_uid,
        project_id: docRow.project_id,
        owner_id: runRow.owner_id,
      })));
    }
  } catch (err) {
    console.error("worker: Arango overlay sync failed (non-fatal):", err);
  }
}
```

Key: this is non-fatal. The overlay data is safe in Postgres. Arango will catch up on the next worker invocation that touches these overlays, or when the user takes a review action via `manage-overlays`.

**Step 2: Create `manage-overlays` edge function**

Create `supabase/functions/manage-overlays/index.ts`:

```ts
import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createUserClient, requireUserId } from "../_shared/supabase.ts";
import { loadArangoConfigFromEnv, syncOverlaysToArango } from "../_shared/arangodb.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const userId = await requireUserId(req);
    const authHeader = req.headers.get("Authorization");
    const { action, run_id, block_uids, block_uid, staging_jsonb } = await req.json();

    const userClient = createUserClient(authHeader);
    const adminClient = createAdminClient();

    let affectedBlockUids: string[] = [];

    if (action === "confirm") {
      const { data, error } = await userClient.rpc("confirm_overlays", {
        p_run_id: run_id,
        p_block_uids: block_uids ?? null,
      });
      if (error) return json(400, { error: error.message });
      affectedBlockUids = block_uids ?? [];
    } else if (action === "reject") {
      const { data, error } = await userClient.rpc("reject_overlays_to_pending", {
        p_run_id: run_id,
        p_block_uids: block_uids ?? null,
      });
      if (error) return json(400, { error: error.message });
      affectedBlockUids = block_uids ?? [];
    } else if (action === "update_staging") {
      const { error } = await userClient.rpc("update_overlay_staging", {
        p_run_id: run_id,
        p_block_uid: block_uid,
        p_staging_jsonb: staging_jsonb,
      });
      if (error) return json(400, { error: error.message });
      affectedBlockUids = [block_uid];
    } else {
      return json(400, { error: `Unknown action: ${action}` });
    }

    // Sync affected overlays to Arango
    const arangoConfig = loadArangoConfigFromEnv();
    if (arangoConfig) {
      let query = adminClient
        .from("block_overlays")
        .select("overlay_uid, run_id, block_uid, status, overlay_jsonb_staging, overlay_jsonb_confirmed, claimed_by, claimed_at, attempt_count, last_error, confirmed_at, confirmed_by")
        .eq("run_id", run_id);

      if (affectedBlockUids.length > 0) {
        query = query.in("block_uid", affectedBlockUids);
      }

      const { data: overlayRows } = await query;

      if (overlayRows && overlayRows.length > 0) {
        // Verify ownership before syncing
        const { data: runRow } = await adminClient
          .from("runs")
          .select("conv_uid, owner_id")
          .eq("run_id", run_id)
          .single();

        if (runRow.owner_id !== userId) {
          return json(403, { error: "Not authorized" });
        }

        const { data: ancestry } = await adminClient
          .from("conversion_parsing")
          .select("source_uid")
          .eq("conv_uid", runRow.conv_uid)
          .single();
        const { data: docRow } = await adminClient
          .from("source_documents")
          .select("project_id")
          .eq("source_uid", ancestry.source_uid)
          .single();

        await syncOverlaysToArango(arangoConfig, overlayRows.map((o) => ({
          ...o,
          source_uid: ancestry.source_uid,
          conv_uid: runRow.conv_uid,
          project_id: docRow.project_id,
          owner_id: runRow.owner_id,
        })));
      }
    }

    return json(200, { ok: true });
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : String(err) });
  }
});
```

**Step 3: Update `BlockViewerGridRDG.tsx` to route through `manage-overlays`**

Replace the four direct `supabase.rpc()` calls (lines ~486, ~501, ~516, ~545) with calls to the edge function via `edgeJson`:

```ts
import { edgeJson } from "../../lib/edge";

// confirm all staged
const data = await edgeJson<{ ok: boolean }>("manage-overlays", {
  method: "POST",
  body: JSON.stringify({ action: "confirm", run_id: selectedRunId }),
});

// confirm single block
const data = await edgeJson<{ ok: boolean }>("manage-overlays", {
  method: "POST",
  body: JSON.stringify({ action: "confirm", run_id: selectedRunId, block_uids: [blockUid] }),
});

// reject single block
const data = await edgeJson<{ ok: boolean }>("manage-overlays", {
  method: "POST",
  body: JSON.stringify({ action: "reject", run_id: selectedRunId, block_uids: [blockUid] }),
});

// update staging
const data = await edgeJson<{ ok: boolean }>("manage-overlays", {
  method: "POST",
  body: JSON.stringify({ action: "update_staging", run_id: selectedRunId, block_uid: blockUid, staging_jsonb: nextStaging }),
});
```

Keep the existing `refetchOverlays()` and `patchOverlay()` calls after each — the realtime subscription handles UI updates.

**Step 4: Write tests for `manage-overlays`**

In `manage-overlays/index.test.ts`, cover:
- confirm success
- reject success
- update_staging success
- missing auth returns 403
- RPC failure returns 400

**Step 5: Run tests and verify worker compiles**

Run the manage-overlays tests:

```bash
deno test supabase/functions/manage-overlays/index.test.ts --allow-env
```

Expected: PASS.

Verify the worker edits compile without errors:

```bash
deno check supabase/functions/worker/index.ts
```

Expected: no type errors. This confirms `touchedBlockUids`, `run_id`, and the Arango imports are wired correctly. The worker itself cannot be meaningfully unit-tested without a full Supabase+LLM mock, but the compile check ensures the batch-sync block is syntactically and type-correct.

**Step 6: Commit**

```bash
git add supabase/functions/worker/index.ts supabase/functions/manage-overlays/index.ts supabase/functions/manage-overlays/index.test.ts web/src/components/blocks/BlockViewerGridRDG.tsx
git commit -m "feat: batch Arango overlay sync in worker, manage-overlays edge function"
```

---

### Task 6: Route delete and reset through Arango-aware cleanup

**Auth model for `manage-document`:**
1. Extract user JWT from `Authorization` header
2. Create a user-scoped client for the delete/reset RPC — `delete_source_document` and `reset_source_document` are `SECURITY DEFINER` functions that already check `auth.uid() = owner_id`
3. Use admin client for Arango cleanup (Arango has no user context)
4. If Arango cleanup fails, write the outbox entry with admin client

**Files:**
- Create: `supabase/functions/manage-document/index.ts`
- Create: `supabase/functions/manage-document/index.test.ts`
- Modify: `web/src/lib/edge.ts`
- Modify: `web/src/pages/useParseWorkbench.tsx`
- Modify: `web/src/pages/useAssetsWorkbench.tsx`
- Modify: `web/src/pages/useEltWorkbench.tsx`
- Modify: `web/src/components/flows/FlowWorkbench.tsx`

**Step 1: Build the `manage-document` edge function**

Create `supabase/functions/manage-document/index.ts`:

```ts
import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import {
  createAdminClient,
  createUserClient,
  requireUserId,
} from "../_shared/supabase.ts";
import {
  deleteProjectionForSourceFromArango,
  loadArangoConfigFromEnv,
  resetProjectionForSourceInArango,
} from "../_shared/arangodb.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    await requireUserId(req);
    const authHeader = req.headers.get("Authorization");
    const { action, source_uid } = await req.json();

    if (!source_uid || typeof source_uid !== "string") {
      return json(400, { error: "Missing source_uid" });
    }
    if (action !== "delete" && action !== "reset") {
      return json(400, { error: `Unknown action: ${action}` });
    }

    // RPC via user client — SECURITY DEFINER checks auth.uid() = owner_id
    const userClient = createUserClient(authHeader);
    const rpcName = action === "delete" ? "delete_source_document" : "reset_source_document";
    const { error: rpcErr } = await userClient.rpc(rpcName, { p_source_uid: source_uid });
    if (rpcErr) return json(400, { error: rpcErr.message });

    // Arango cleanup via admin client
    const arangoConfig = loadArangoConfigFromEnv();
    if (arangoConfig) {
      try {
        if (action === "delete") {
          await deleteProjectionForSourceFromArango(arangoConfig, source_uid);
        } else {
          await resetProjectionForSourceInArango(arangoConfig, source_uid);
        }
      } catch (err) {
        // Postgres succeeded but Arango failed — write outbox for retry
        const adminClient = createAdminClient();
        await adminClient.from("cleanup_outbox").insert({
          source_uid,
          action,
          last_error: err instanceof Error ? err.message : String(err),
        });
        return json(207, {
          ok: false,
          partial: true,
          error: "Arango cleanup pending",
        });
      }
    }

    return json(200, { ok: true });
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : String(err) });
  }
});
```

**Step 2: Add tests**

In `manage-document/index.test.ts`, cover:
- delete success
- reset success
- RPC failure returns 400
- Arango failure writes outbox row and returns 207
- missing auth

**Step 3: Add a shared frontend helper**

In `web/src/lib/edge.ts`, add:

```ts
export async function manageDocument(
  action: "delete" | "reset",
  sourceUid: string,
): Promise<{ ok: boolean; partial?: boolean; error?: string }> {
  const resp = await edgeFetch("manage-document", {
    method: "POST",
    body: JSON.stringify({ action, source_uid: sourceUid }),
  });
  return resp.json();
}
```

**Step 4: Update all delete/reset callers**

Replace direct `supabase.rpc('delete_source_document', ...)` and `supabase.rpc('reset_source_document', ...)` calls in:

- `web/src/pages/useParseWorkbench.tsx` — `handleReset` (~line 744) and `handleDelete` (~line 753)
- `web/src/pages/useAssetsWorkbench.tsx` — `handleDelete` (~line 50)
- `web/src/pages/useEltWorkbench.tsx` — `handleDelete` (~line 239)
- `web/src/components/flows/FlowWorkbench.tsx` — `handleDelete` (~line 822)

With:

```ts
import { manageDocument } from "../lib/edge";

const result = await manageDocument("delete", doc.source_uid);
if (result.partial) {
  // Postgres succeeded but Arango cleanup is pending — warn but don't block the UI.
  console.warn("Arango cleanup pending for", doc.source_uid);
  toast.warning("Document removed, but background cleanup is still pending.");
} else if (!result.ok) {
  throw new Error(result.error ?? "Delete failed");
}
```

Callers should treat `partial: true` as a non-blocking warning, not a hard error. The Postgres operation succeeded; the `cleanup_outbox` will handle the Arango retry.

Note: `useAssetsWorkbench.tsx` also deletes from Storage after the RPC — keep that Storage deletion after `manageDocument` succeeds (even on partial).

**Step 5: Run tests**

Run: `deno test supabase/functions/manage-document/index.test.ts --allow-env`

Expected: PASS.

**Step 6: Commit**

```bash
git add supabase/functions/manage-document/index.ts supabase/functions/manage-document/index.test.ts web/src/lib/edge.ts web/src/pages/useParseWorkbench.tsx web/src/pages/useAssetsWorkbench.tsx web/src/pages/useEltWorkbench.tsx web/src/components/flows/FlowWorkbench.tsx
git commit -m "feat: route document delete and reset through Arango-aware cleanup"
```

---

### Task 7: Document the projection and verify end to end

**Files:**
- Modify: `supabase/functions/README.md`
- Modify: `web-docs/src/content/docs/internal/arango-cloud.md`

**Step 1: Document the final collection model**

Add a section naming all five collections: `blockdata_documents`, `blockdata_docling_documents`, `blockdata_blocks`, `blockdata_runs`, `blockdata_overlays`.

Clarify:
- Original uploaded files stay in Supabase Storage
- Arango stores the full Docling payload, not the raw binary
- `overlay_uid` is first-class in Postgres and Arango
- `cleanup_outbox` provides durable retry for partial Arango failures

**Step 2: Document the delete/reset/re-parse behavior**

Explain that delete/reset/re-parse clear: Docling payloads, blocks, runs, overlays. A reset preserves the document metadata row in upload-stage shape. A re-parse clears stale Arango data before the new conversion starts.

**Step 3: Smoke test the full flow**

Run on a real document:

1. Upload document
2. Let it parse
3. Verify Arango has: document metadata, full `doclingdocument_json`, block rows
4. Create a run
5. Verify Arango has run rows and overlay rows with `overlay_uid`
6. Perform one overlay review action
7. Verify Arango overlay state updates
8. Reset document
9. Verify Arango removes Docling payload, blocks, runs, and overlays but keeps document metadata as `uploaded`
10. Delete document
11. Verify Arango removes everything for that `source_uid`

Use these AQL verification queries and record exact query, result count, and a representative row:

```
FOR d IN blockdata_documents FILTER d.source_uid == @uid RETURN d
FOR d IN blockdata_docling_documents FILTER d.source_uid == @uid RETURN d
FOR b IN blockdata_blocks FILTER b.source_uid == @uid RETURN b
FOR r IN blockdata_runs FILTER r.source_uid == @uid RETURN r
FOR o IN blockdata_overlays FILTER o.source_uid == @uid RETURN o
```

**Step 4: Commit**

```bash
git add supabase/functions/README.md web-docs/src/content/docs/internal/arango-cloud.md
git commit -m "docs: document self-contained Arango docling projection"
```

---

## Verification Checklist

- `public.block_overlays.overlay_uid` exists, is backfilled, and is unique
- `deno test supabase/functions/_shared/arangodb.test.ts --allow-env` passes
- `conversion-complete` syncs full `doclingdocument_json` to Arango (including fast-path callback)
- Arango blocks preserve `source_uid`, `conv_uid`, and `block_uid`
- Arango run rows preserve `run_id`, `source_uid`, and `conv_uid`
- Arango overlay rows preserve `overlay_uid`, `run_id`, `block_uid`, and current overlay state
- Worker batch-syncs touched overlays to Arango once after all mutations (non-fatal)
- `manage-overlays` syncs affected overlays after each review action
- `manage-document` writes a `cleanup_outbox` row and returns `207` when Arango cleanup fails
- Delete and reset remove Arango data from all five collections for the target `source_uid`
- `ensureCollection` skips redundant checks via `_collectionCache`

## Acceptance Criteria

- Arango reconstructs a full Docling-parsed document from its own data alone
- `source_uid`, `conv_uid`, `block_uid`, `run_id`, and `overlay_uid` all present in the Arango projection
- Original uploaded files remain in Supabase Storage, not Arango
- Runs and overlays are part of the required projection, not future work
- Delete, reset, and re-parse clean up all Arango records for the source document
- The projection remains Docling-specific by design

## What This Plan Does Not Cover

- Reconciliation sweep for `cleanup_outbox` (the table and write paths exist; the reader/retry loop is a separate task)
- Parser-agnostic projection for non-Docling documents
- Raw original-file replication into Arango
- Graph edges between documents, blocks, runs, overlays, projects, or citations
- ArangoSearch views or full-text indexes
- Replacement of existing `source_uid`, `conv_uid`, or `block_uid` formats