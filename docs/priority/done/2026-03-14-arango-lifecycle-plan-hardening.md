# Arango Lifecycle Plan Hardening

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the seven blocking and major gaps identified in the Arango document lifecycle automation assessment so the plan is implementation-ready.

**Architecture:** Six tasks are amendments to `arangodb.ts` and surrounding edge functions. One task adds a small Postgres migration for a cleanup outbox table. All changes land in existing files except the outbox migration. The parent plan (`docs/priority/2026-03-14-arango-document-lifecycle-automation.md`) is updated in-place as the final task.

**Tech Stack:** Supabase Edge Functions, Supabase Postgres migrations, ArangoDB Cloud, TypeScript, Deno tests

---

## Context

The Arango document lifecycle automation plan passed architectural review but failed on seven specific gaps. This plan implements the fixes so the parent plan can proceed. Each task is self-contained and testable.

The seven gaps:

1. Migration filename collides with existing `085`/`086`/`087`
2. Delete/reset has no recovery path for partial Arango failure
3. Re-parse path in `trigger-parse` leaves stale Arango data
4. Auth model for new edge functions is unspecified
5. Reset contract doesn't lock field values
6. Test harness pattern is undefined for new functions
7. Overlay consumer verification list is incomplete

---

### Task 1: Add cleanup outbox migration

This is the only new schema change. It creates a `cleanup_outbox` table so partial Arango failures during delete/reset can be retried.

**Files:**
- Create: `supabase/migrations/20260314140000_088_add_cleanup_outbox.sql`

**Step 1: Write the migration**

Create `supabase/migrations/20260314140000_088_add_cleanup_outbox.sql`:

```sql
-- Migration 088: cleanup outbox for cross-system reconciliation.
-- When a Postgres delete/reset succeeds but Arango cleanup fails,
-- a row is written here so a reconciliation sweep can retry.

CREATE TABLE IF NOT EXISTS public.cleanup_outbox (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_uid TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('delete', 'reset')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_cleanup_outbox_pending
  ON public.cleanup_outbox (created_at)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE public.cleanup_outbox IS
  'Retryable outbox for Arango cleanup after Postgres delete/reset succeeds but Arango fails.';
```

**Step 2: Verify ordering**

Run:

```bash
ls supabase/migrations/ | tail -5
```

Expected: `20260314140000_088_add_cleanup_outbox.sql` sorts after `20260314130000_087_upload_support_all_remove_upload_gates.sql`.

**Step 3: Commit**

```bash
git add supabase/migrations/20260314140000_088_add_cleanup_outbox.sql
git commit -m "feat: add cleanup_outbox table for Arango reconciliation"
```

---

### Task 2: Add Arango delete and reset projection helpers with collection caching

These helpers are required by the parent plan's Task 2 and Task 6, and by the re-parse cleanup in Task 3 below.

**Files:**
- Modify: `supabase/functions/_shared/arangodb.ts`
- Modify: `supabase/functions/_shared/arangodb.test.ts`

**Step 1: Write the failing tests**

Add these tests to `supabase/functions/_shared/arangodb.test.ts`:

```ts
Deno.test("deleteProjectionForSourceFromArango removes document and blocks by source_uid", async () => {
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
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  };

  await deleteProjectionForSourceFromArango(config, "source-1");

  // Should delete blocks via AQL, then delete the document by _key
  assertEquals(calls.length, 2);

  // First call: delete blocks by source_uid
  assertEquals(calls[0].url, "https://arango.example.com/_db/blockdata/_api/cursor");
  const deleteBlocksBody = calls[0].body as Record<string, unknown>;
  assertEquals(
    deleteBlocksBody.query,
    "FOR b IN @@blocks FILTER b.source_uid == @source_uid REMOVE b IN @@blocks",
  );

  // Second call: delete document by _key
  assertEquals(
    calls[1].url,
    "https://arango.example.com/_db/blockdata/_api/document/documents/source-1",
  );
  assertEquals(calls[1].method, "DELETE");
});

Deno.test("resetProjectionForSourceInArango removes blocks and patches document to upload-stage shape", async () => {
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
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  };

  await resetProjectionForSourceInArango(config, "source-1");

  // Should delete blocks via AQL, then patch the document
  assertEquals(calls.length, 2);

  // First call: delete blocks
  assertEquals(calls[0].url, "https://arango.example.com/_db/blockdata/_api/cursor");

  // Second call: patch document to upload-stage shape
  assertEquals(
    calls[1].url,
    "https://arango.example.com/_db/blockdata/_api/document/documents/source-1",
  );
  assertEquals(calls[1].method, "PATCH");

  const patchBody = calls[1].body as Record<string, unknown>;
  assertEquals(patchBody.status, "uploaded");
  assertEquals(patchBody.conversion_job_id, null);
  assertEquals(patchBody.conv_uid, null);
  assertEquals(patchBody.conv_locator, null);
  assertEquals(patchBody.conv_status, null);
  assertEquals(patchBody.conv_representation_type, null);
  assertEquals(patchBody.pipeline_config, null);
  assertEquals(patchBody.block_count, null);
  assertEquals(patchBody.error, null);
});
```

Update the import to include the new functions:

```ts
import {
  type ArangoConfig,
  deleteProjectionForSourceFromArango,
  loadArangoConfigFromEnv,
  resetProjectionForSourceInArango,
  syncAssetToArango,
  syncParsedDocumentToArango,
  toArangoKey,
} from "./arangodb.ts";
```

**Step 2: Run tests to verify they fail**

Run: `deno test supabase/functions/_shared/arangodb.test.ts --allow-env`

Expected: FAIL — `deleteProjectionForSourceFromArango` and `resetProjectionForSourceInArango` are not exported.

**Step 3: Implement the helpers**

Add to `supabase/functions/_shared/arangodb.ts`, after the existing `syncAssetToArango` function:

```ts
/**
 * Upload-stage reset payload. Every field here must match the shape
 * written by process-upload-only.ts (lines 49-69) so reset restores
 * the exact same Arango document state as a fresh upload.
 */
const UPLOAD_STAGE_RESET_FIELDS: Record<string, unknown> = {
  status: "uploaded",
  conversion_job_id: null,
  conv_uid: null,
  conv_locator: null,
  conv_status: null,
  conv_representation_type: null,
  pipeline_config: null,
  block_count: null,
  error: null,
};

export async function deleteProjectionForSourceFromArango(
  config: ArangoConfig,
  sourceUid: string,
): Promise<void> {
  await deleteBlocksForSource(config, sourceUid);
  await deleteDocument(config, config.documentsCollection, sourceUid);
}

export async function resetProjectionForSourceInArango(
  config: ArangoConfig,
  sourceUid: string,
): Promise<void> {
  await deleteBlocksForSource(config, sourceUid);
  await patchDocument(config, config.documentsCollection, sourceUid, {
    ...UPLOAD_STAGE_RESET_FIELDS,
    synced_at: new Date().toISOString(),
  });
}
```

Add these private helpers above the new exports:

```ts
async function deleteDocument(
  config: ArangoConfig,
  collection: string,
  sourceUid: string,
): Promise<void> {
  const resp = await arangoRequest(
    config,
    `/_api/document/${encodeURIComponent(collection)}/${encodeURIComponent(toArangoKey(sourceUid))}`,
    { method: "DELETE" },
  );
  if (resp.ok || resp.status === 404) return;
  const body = await resp.text().catch(() => "");
  throw new Error(
    `Arango deleteDocument failed for ${collection}: ${resp.status} ${body.slice(0, 300)}`,
  );
}

async function patchDocument(
  config: ArangoConfig,
  collection: string,
  sourceUid: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const resp = await arangoRequest(
    config,
    `/_api/document/${encodeURIComponent(collection)}/${encodeURIComponent(toArangoKey(sourceUid))}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  if (resp.ok) return;
  const body = await resp.text().catch(() => "");
  throw new Error(
    `Arango patchDocument failed for ${collection}: ${resp.status} ${body.slice(0, 300)}`,
  );
}
```

**Step 4: Add collection cache**

Add a module-level cache and reset function. Replace `ensureDocumentsCollection` and `ensureBlocksCollection` with cached versions:

```ts
const _collectionCache = new Set<string>();

export function _resetCollectionCache(): void {
  _collectionCache.clear();
}

async function ensureCachedCollection(
  config: ArangoConfig,
  name: string,
): Promise<void> {
  if (_collectionCache.has(name)) return;
  await ensureCollection(config, name);
  _collectionCache.add(name);
}
```

Then update `ensureDocumentsCollection` and `ensureBlocksCollection` to call `ensureCachedCollection` instead of `ensureCollection` directly.

**Step 5: Run tests to verify they pass**

Run: `deno test supabase/functions/_shared/arangodb.test.ts --allow-env`

Expected: PASS for all tests including the two new ones.

**Step 6: Commit**

```bash
git add supabase/functions/_shared/arangodb.ts supabase/functions/_shared/arangodb.test.ts
git commit -m "feat: add Arango delete/reset projection helpers with collection cache"
```

---

### Task 3: Add Arango cleanup to trigger-parse re-parse path

When a user retries a failed parse, `trigger-parse` already clears stale Postgres rows. This task adds the matching Arango cleanup so stale projection data doesn't persist.

**Files:**
- Modify: `supabase/functions/trigger-parse/index.ts`

**Step 1: Add the Arango import**

At the top of `supabase/functions/trigger-parse/index.ts`, add:

```ts
import {
  deleteProjectionForSourceFromArango,
  loadArangoConfigFromEnv,
} from "../_shared/arangodb.ts";
```

**Step 2: Add Arango cleanup after the existing Postgres cleanup block**

After the existing cleanup block (lines 97-102), add:

```ts
// Clear stale Arango projection data from previous conversion attempts.
const arangoConfig = loadArangoConfigFromEnv();
if (arangoConfig) {
  try {
    await deleteProjectionForSourceFromArango(arangoConfig, source_uid);
  } catch (err) {
    console.error("trigger-parse: Arango cleanup failed (non-fatal):", err);
    // Non-fatal: the new conversion-complete will overwrite Arango anyway.
    // But log it so we can detect drift.
  }
}
```

This is non-fatal because `conversion-complete` will overwrite the projection on success. But it prevents stale data from persisting if the re-parse also fails.

**Step 3: Run existing tests**

Run: `deno test supabase/functions/ --allow-env --allow-net --allow-read`

Expected: No regressions. `trigger-parse` has no existing test file, but imports must compile.

**Step 4: Commit**

```bash
git add supabase/functions/trigger-parse/index.ts
git commit -m "feat: clear stale Arango projection on re-parse"
```

---

### Task 4: Update the parent plan document with all hardening amendments

This task applies all seven fixes to the parent plan in a single edit pass.

**Files:**
- Modify: `docs/priority/2026-03-14-arango-document-lifecycle-automation.md`

**Step 1: Fix migration filename (gap 1)**

Find all references to `20260314103000_085_add_overlay_uid.sql` in the plan and replace with `20260314150000_089_add_overlay_uid.sql`.

Note: `088` is now taken by the cleanup outbox migration from Task 1 above.

**Step 2: Add cleanup outbox to Task 6 (gap 2)**

Replace the current Task 6 Step 1 bullet 3:

> 3. return `502` if Postgres succeeded but Arango cleanup failed

With:

> 3. if Arango cleanup fails after Postgres success:
>    a. write a row to `cleanup_outbox` with `source_uid`, `action`, and the error message
>    b. return `207 Multi-Status` with `{ ok: false, partial: true, error: "Arango cleanup pending" }`
>    c. a reconciliation sweep (manual or cron) retries pending outbox entries by calling `deleteProjectionForSourceFromArango` or `resetProjectionForSourceInArango`

Update the verification checklist item from:

> `manage-document` returns `502` when Arango cleanup fails after Postgres success

To:

> `manage-document` writes a `cleanup_outbox` row and returns `207` when Arango cleanup fails after Postgres success

**Step 3: Add re-parse cleanup (gap 3)**

Add a new section between Task 3 and Task 4:

> ### Task 3.5: Clear stale Arango projection on re-parse
>
> **Files:**
> - Modify: `supabase/functions/trigger-parse/index.ts`
>
> After the existing Postgres cleanup block (lines 97-102), call `deleteProjectionForSourceFromArango(config, source_uid)`. Wrap in try/catch as non-fatal — `conversion-complete` will overwrite on success, but this prevents stale data if the re-parse also fails.
>
> **Already implemented** by the hardening plan.

**Step 4: Specify auth model (gap 4)**

Add to the top of Task 5:

> **Auth model for `manage-overlays`:**
> 1. Extract user JWT from `Authorization` header
> 2. Create a user-scoped client (`createUserClient(authHeader)`) for the RPC call — this respects RLS and ownership
> 3. After RPC success, create an admin client (`createAdminClient()`) to read the affected overlay rows for Arango sync
> 4. Before syncing to Arango, verify `owner_id` on fetched rows matches the authenticated user
>
> Same pattern for `manage-document` in Task 6.

Add to the top of Task 6:

> **Auth model for `manage-document`:**
> 1. Extract user JWT from `Authorization` header
> 2. Create a user-scoped client for the delete/reset RPC — `delete_source_document` and `reset_source_document` are `SECURITY DEFINER` functions that already check `auth.uid() = owner_id`
> 3. Use admin client for Arango cleanup (Arango has no user context)
> 4. If Arango cleanup fails, write the outbox entry with admin client

**Step 5: Define reset payload contract (gap 5)**

Add to Task 2 Step 5, inside the description of `resetProjectionForSourceInArango`:

> The reset payload must restore these exact values (source: `process-upload-only.ts:49-69`):
>
> | Field | Reset value |
> |---|---|
> | `status` | `"uploaded"` |
> | `conversion_job_id` | `null` |
> | `conv_uid` | `null` |
> | `conv_locator` | `null` |
> | `conv_status` | `null` |
> | `conv_representation_type` | `null` |
> | `pipeline_config` | `null` |
> | `block_count` | `null` |
> | `error` | `null` |
>
> This is codified as `UPLOAD_STAGE_RESET_FIELDS` in `arangodb.ts`.

**Step 6: Define test harness pattern (gap 6)**

Add to the plan's Context section or as a preamble before Task 2:

> **Test harness pattern for all new edge function tests:**
>
> Use the established pattern from `arangodb.test.ts`:
> - Framework: `Deno.test()` with `assertEquals` from `https://deno.land/std@0.224.0/assert/mod.ts`
> - Arango mocking: inject `fetchImpl` into `ArangoConfig`, capture calls in `Array<{ url, method, body }>`
> - Supabase mocking: create a stub object with chained `.from().select().eq()` methods that return test data
> - Each test covers one behavior, asserts exact URLs/methods/bodies
>
> **Smoke test verification queries for Task 7:**
>
> ```
> FOR d IN blockdata_documents FILTER d.source_uid == @uid RETURN d
> FOR d IN blockdata_docling_documents FILTER d.source_uid == @uid RETURN d
> FOR b IN blockdata_blocks FILTER b.source_uid == @uid RETURN b
> FOR r IN blockdata_runs FILTER r.source_uid == @uid RETURN r
> FOR o IN blockdata_overlays FILTER o.source_uid == @uid RETURN o
> ```
>
> Record each query and its result count in the smoke test log.

**Step 7: Expand overlay consumer list (gap 7)**

In Task 1 Step 3, expand the verification list from:

> - `web/src/hooks/useOverlays.ts`
> - `supabase/functions/worker/index.ts`
> - `supabase/functions/export-jsonl/index.ts`

To:

> - `web/src/hooks/useOverlays.ts` — `select('*')` + realtime subscription
> - `web/src/components/blocks/BlockViewerGridRDG.tsx` — imports `useOverlays` hook
> - `supabase/functions/worker/index.ts` — 10 separate `.from("block_overlays")` query sites (admin client)
> - `supabase/functions/export-jsonl/index.ts` — reads confirmed overlays (user client)
> - `web/src/lib/tables.ts` — `TABLES.overlays` constant definition

**Step 8: Commit**

```bash
git add docs/priority/2026-03-14-arango-document-lifecycle-automation.md
git commit -m "docs: apply hardening amendments to Arango lifecycle plan"
```

---

## Verification Checklist

- `20260314140000_088_add_cleanup_outbox.sql` sorts after migration `087`
- `deleteProjectionForSourceFromArango` removes blocks then the document row
- `resetProjectionForSourceInArango` removes blocks then patches document to exact upload-stage field values
- Collection cache skips redundant `ensureCollection` calls after the first success
- `trigger-parse` calls Arango cleanup after Postgres cleanup on re-parse
- Parent plan references updated migration filename `20260314150000_089`
- Parent plan specifies auth model (user client for RPC, admin for Arango sync, ownership check)
- Parent plan specifies `207` + outbox row for partial Arango failure, not `502`
- Parent plan includes reset payload field table
- Parent plan includes test harness pattern and smoke test AQL queries
- Parent plan lists all five overlay consumers

## Acceptance Criteria

- All three assessment blockers (migration ordering, reconciliation, re-parse cleanup) are resolved
- All four assessment major findings (auth, reset contract, test plan, overlay consumers) are addressed
- `deno test supabase/functions/_shared/arangodb.test.ts --allow-env` passes with new delete/reset tests
- Parent plan passes re-assessment with no remaining `Fail` criteria