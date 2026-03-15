# Arango Document Lifecycle Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Arango a self-sufficient projection for current Docling-parsed documents by syncing lifecycle metadata, full `doclingdocument_json`, normalized blocks, runs, and overlays, while preserving delete/reset cleanup and reducing redundant Arango collection checks.

**Architecture:** Supabase remains the system of record for ownership, lifecycle, runs, overlays, and Storage artifacts. Supabase Storage continues to hold the original uploaded file. ArangoDB Cloud becomes a derived but self-contained parsed-document projection for the current Docling-only parsing track: document metadata lives in `blockdata_documents`, full Docling payloads in `blockdata_docling_documents`, normalized blocks in `blockdata_blocks`, run rows in `blockdata_runs`, and overlay rows in `blockdata_overlays`. This plan intentionally adds `overlay_uid` to Postgres so overlay identity is explicit instead of inferred from `(run_id, block_uid)`.

**Tech Stack:** Supabase Edge Functions, Supabase Postgres migrations, Supabase Storage, ArangoDB Cloud, TypeScript, Deno tests, Markdown docs

---

## Context

The current Arango sync covers only document metadata and normalized blocks. That leaves three important gaps:

1. **The projection is not self-contained.** Arango can show flattened block text, but it cannot reconstruct a full Docling document from its own data because the full `doclingdocument_json` never leaves Supabase Storage.
2. **Overlay identity is implicit.** The current overlay model uses `(run_id, block_uid)` as the key. That is workable inside Postgres, but it is not explicit enough for a cross-system projection requirement. We will add `overlay_uid` and keep the existing composite key for compatibility.
3. **Delete/reset cleanup is incomplete.** Current RPCs remove Postgres rows but do not remove Arango documents, blocks, Docling payloads, runs, or overlays.

There is also one current-state constraint that simplifies this plan:

4. **Parsing is Docling-only today.** Migration `20260313220000_081_docling_only_parsing.sql` removed non-Docling parsed documents from the current live model. That means a Docling-specific self-contained projection is acceptable for this plan. If non-Docling parsing returns later, write a separate parser-agnostic projection plan instead of widening this one ad hoc.

## Desired Projection Contract

1. User uploads a file -> Arango upserts the document metadata in `blockdata_documents` with `status: "uploaded"` and no parse payload.
2. Conversion starts -> Arango updates the same document metadata with `status: "converting"`.
3. Parse succeeds -> Arango stores:
   - a document metadata record keyed by `source_uid`
   - a full `doclingdocument_json` payload keyed by `conv_uid`
   - normalized block rows keyed by `block_uid`
   - run rows keyed by `run_id`
   - overlay rows keyed by `overlay_uid`
4. Arango must be able to reconstruct and display the full parsed document for a Docling document from its own data alone, without downloading Docling JSON back from Supabase Storage.
5. The original uploaded file remains in Supabase Storage. Arango does not need the raw PDF or DOCX bytes.
6. User deletes document -> Arango removes the document record, Docling payload, blocks, runs, and overlays for that `source_uid`.
7. User resets document -> Arango removes the Docling payload, blocks, runs, and overlays for that `source_uid`, then restores the document metadata row to upload-stage shape.

## Identity Contract

- `source_uid` remains the source document identity.
- `conv_uid` remains the parse-version identity.
- `block_uid` remains the normalized block identity and continues to use the current `${conv_uid}:${block_index}` format.
- `overlay_uid` will be added to Postgres as a first-class UUID column on `block_overlays`.
- `run_id` remains the run identity.

Every Arango run and overlay record must carry enough ancestry to join back to the document:

- runs: `run_id`, `source_uid`, `conv_uid`, `project_id`
- overlays: `overlay_uid`, `run_id`, `source_uid`, `conv_uid`, `block_uid`, `project_id`

## Out of Scope

- Raw original file bytes in Arango
- Parser-agnostic document payloads beyond the current Docling-only parsing track
- Graph edges or ArangoSearch views
- Replacing the existing `source_uid`, `conv_uid`, or `block_uid` format
- Replacing the existing `(run_id, block_uid)` composite key on `block_overlays`

---

### Task 1: Add `overlay_uid` to the Postgres overlay model

**Files:**
- Create: `supabase/migrations/20260314103000_085_add_overlay_uid.sql`
- Modify: `web/src/lib/types.ts`
- Verify: `supabase/functions/runs/index.ts`
- Verify: `supabase/functions/worker/index.ts`

**Step 1: Write the migration**

Create `20260314103000_085_add_overlay_uid.sql`:

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

**Step 2: Update the frontend overlay type**

Add `overlay_uid` to `BlockOverlayRow` in `web/src/lib/types.ts`:

```ts
export type BlockOverlayRow = {
  overlay_uid: string;
  run_id: string;
  block_uid: string;
  overlay_jsonb_staging: Record<string, unknown>;
  overlay_jsonb_confirmed: Record<string, unknown>;
  status: "pending" | "claimed" | "ai_complete" | "confirmed" | "failed";
  claimed_by: string | null;
  claimed_at: string | null;
  attempt_count: number;
  last_error: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
};
```

**Step 3: Verify existing code paths remain compatible**

Confirm that all current overlay queries use `select('*')` or otherwise tolerate the added column:

- `web/src/hooks/useOverlays.ts`
- `supabase/functions/worker/index.ts`
- `supabase/functions/export-jsonl/index.ts`

No code changes should be needed if these paths do not hard-fail on the extra column.

**Step 4: Apply the migration locally and validate the schema**

Run the local migration command used for this repo.

Expected:
- `public.block_overlays.overlay_uid` exists
- existing rows are backfilled
- new inserts receive a UUID automatically

**Step 5: Commit**

```bash
git add supabase/migrations/20260314103000_085_add_overlay_uid.sql web/src/lib/types.ts
git commit -m "feat: add overlay_uid to block_overlays"
```

---

### Task 2: Expand the Arango helper contract for self-contained Docling projections

**Files:**
- Modify: `supabase/functions/_shared/arangodb.ts`
- Modify: `supabase/functions/_shared/arangodb.test.ts`

**Step 1: Add the new collection config fields**

Extend `ArangoConfig` and `loadArangoConfigFromEnv()`:

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

Default the new collections to:

- `blockdata_docling_documents`
- `blockdata_runs`
- `blockdata_overlays`

**Step 2: Add the new projection types**

Add:

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
  synced_at: string;
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

**Step 3: Update `ArangoParsedDocument` to carry the full Docling payload**

Add:

```ts
export type ArangoParsedDocument = ArangoAssetDocument & {
  conv_uid: string;
  conv_locator: string;
  conv_status: string;
  conv_representation_type: string;
  docling_document_json: Record<string, unknown>;
  blocks: ArangoBlockRecord[];
};
```

**Step 4: Write the failing helper tests**

In `arangodb.test.ts`, add tests that verify:

- `syncParsedDocumentToArango` writes the main document metadata row
- `syncParsedDocumentToArango` writes a `docling_document_json` record keyed by `conv_uid`
- block rows preserve `block_uid`, `conv_uid`, `source_uid`, and `block_locator`
- `syncRunToArango` writes a run row with `run_id`, `source_uid`, and `conv_uid`
- `syncOverlaysToArango` writes overlay rows with `overlay_uid`, `run_id`, and `block_uid`

Use a fetch stub and assert the request bodies directly.

**Step 5: Implement the new helper functions**

Add:

- `syncRunToArango(config, run)`
- `syncOverlaysToArango(config, overlays)`
- `deleteProjectionForSourceFromArango(config, sourceUid)`
- `resetProjectionForSourceInArango(config, sourceUid)`

Delete and reset must remove:

- blocks by `source_uid`
- docling payloads by `source_uid`
- runs by `source_uid`
- overlays by `source_uid`

Then:

- `deleteProjectionForSourceFromArango` deletes the document row
- `resetProjectionForSourceInArango` patches the document row back to upload-stage shape

**Step 6: Add collection caching**

Keep `_resetCollectionCache()` and cache all five collections, not just documents and blocks.

**Step 7: Run helper tests**

Run: `deno test supabase/functions/_shared/arangodb.test.ts --allow-env`

Expected: PASS for documents, Docling payloads, blocks, runs, overlays, delete/reset, and cache tests.

**Step 8: Commit**

```bash
git add supabase/functions/_shared/arangodb.ts supabase/functions/_shared/arangodb.test.ts
git commit -m "feat: expand Arango helpers for self-contained docling projection"
```

---

### Task 3: Always sync the full `doclingdocument_json` from `conversion-complete`

**Files:**
- Modify: `supabase/functions/conversion-complete/index.ts`
- Verify: `supabase/functions/_shared/docling.ts`

**Step 1: Make the Docling bytes available before Arango sync**

The current code already downloads `docling_key` when `conv_uid` or blocks are missing. Change that flow so `doclingBytes` are always available before the Arango sync path.

**Step 2: Parse the Docling JSON once**

Add:

```ts
const doclingDocumentJson = JSON.parse(
  new TextDecoder().decode(doclingBytes),
) as Record<string, unknown>;
```

Do not decode or parse the same payload twice.

**Step 3: Keep `conv_uid` derived from the Docling bytes**

Retain the current contract:

```ts
const convPrefix = new TextEncoder().encode("docling\ndoclingdocument_json\n");
conv_uid = await sha256Hex(concatBytes([convPrefix, doclingBytes]));
```

**Step 4: Pass the full payload to `syncParsedDocumentToArango`**

Update the call site:

```ts
await syncParsedDocumentToArango(arangoConfig, {
  ...,
  conv_uid,
  conv_locator: docling_key,
  conv_status: "success",
  conv_representation_type: "doclingdocument_json",
  docling_document_json: doclingDocumentJson,
  blocks: blockRows,
});
```

**Step 5: Preserve block identity**

Keep the existing normalized block generation:

```ts
block_uid: `${conv_uid}:${idx}`,
```

This plan does not change block identity format.

**Step 6: Add a focused regression test**

Create `supabase/functions/conversion-complete/index.test.ts` and assert that a successful Docling callback:

- computes or reuses `conv_uid`
- writes `block_uid`s using that `conv_uid`
- passes a parsed `docling_document_json` object to the Arango helper

**Step 7: Run tests**

Run the new `conversion-complete` test file and the shared Arango tests.

Expected: PASS.

**Step 8: Commit**

```bash
git add supabase/functions/conversion-complete/index.ts supabase/functions/conversion-complete/index.test.ts
git commit -m "feat: sync full doclingdocument_json to Arango on parse completion"
```

---

### Task 4: Sync runs and initial overlays to Arango when runs are created

**Files:**
- Modify: `supabase/functions/runs/index.ts`
- Modify: `supabase/functions/_shared/arangodb.ts`
- Create: `supabase/functions/runs/index.test.ts`

**Step 1: Fetch the created run row with ancestry fields**

After the run RPC succeeds, fetch:

- `runs.run_id`
- `runs.conv_uid`
- joined `conversion_parsing.source_uid`
- joined `view_documents.project_id`
- `owner_id`

**Step 2: Fetch the initial overlay rows**

Query `block_overlays` by `run_id` and select:

- `overlay_uid`
- `run_id`
- `block_uid`
- `status`
- `overlay_jsonb_staging`
- `overlay_jsonb_confirmed`
- `claimed_by`
- `claimed_at`
- `attempt_count`
- `last_error`
- `confirmed_at`
- `confirmed_by`

Also resolve `source_uid`, `conv_uid`, `project_id`, and `owner_id` for each overlay payload before syncing to Arango.

**Step 3: Sync the run and overlays**

Call:

```ts
await syncRunToArango(arangoConfig, runRecord);
await syncOverlaysToArango(arangoConfig, overlayRecords);
```

**Step 4: Add the failing test**

In `runs/index.test.ts`, assert that a successful run creation:

- returns `run_id`
- calls the Arango run helper once
- calls the Arango overlay helper once with rows that include `overlay_uid`

**Step 5: Run tests**

Run the new run-function test file.

Expected: PASS.

**Step 6: Commit**

```bash
git add supabase/functions/runs/index.ts supabase/functions/runs/index.test.ts supabase/functions/_shared/arangodb.ts
git commit -m "feat: sync runs and initial overlays to Arango"
```

---

### Task 5: Keep overlay state in Arango when worker and review flows mutate overlays

**Files:**
- Modify: `supabase/functions/worker/index.ts`
- Create: `supabase/functions/manage-overlays/index.ts`
- Create: `supabase/functions/manage-overlays/index.test.ts`
- Modify: `web/src/components/blocks/BlockViewerGridRDG.tsx`

**Step 1: Sync worker-written overlays after batch processing**

In `worker/index.ts`, after overlay rows are updated, fetch the touched overlay rows by:

- `run_id`
- touched `block_uid`s

Then call `syncOverlaysToArango(...)`.

This must happen for:

- AI completion writes
- retry-to-pending writes
- failed writes
- claim release paths that materially change overlay state

**Step 2: Create a `manage-overlays` edge function for review actions**

Wrap these user actions:

- `update_overlay_staging`
- `confirm_overlays`
- `reject_overlays_to_pending`

The edge function should:

1. authenticate the caller
2. call the existing RPC
3. fetch the affected overlay rows
4. sync those overlay rows to Arango
5. return `{ ok: true }` or a clear error

**Step 3: Update the frontend review actions**

In `BlockViewerGridRDG.tsx`, route review mutations through `manage-overlays` instead of bare RPC calls.

**Step 4: Add automated tests**

In `manage-overlays/index.test.ts`, cover:

- staging update success
- confirm success
- reject-to-pending success
- Arango sync failure surfacing an error instead of silent success

**Step 5: Run tests**

Run the worker test coverage you add plus the new edge-function tests.

Expected: PASS.

**Step 6: Commit**

```bash
git add supabase/functions/worker/index.ts supabase/functions/manage-overlays/index.ts supabase/functions/manage-overlays/index.test.ts web/src/components/blocks/BlockViewerGridRDG.tsx
git commit -m "feat: keep Arango overlays in sync with worker and review mutations"
```

---

### Task 6: Route delete and reset through Arango-aware cleanup

**Files:**
- Create: `supabase/functions/manage-document/index.ts`
- Create: `supabase/functions/manage-document/index.test.ts`
- Modify: `web/src/lib/edge.ts`
- Modify: `web/src/pages/useParseWorkbench.tsx`
- Modify: `web/src/pages/useAssetsWorkbench.tsx`
- Modify: `web/src/pages/useEltWorkbench.tsx`
- Modify: `web/src/components/flows/FlowWorkbench.tsx`

**Step 1: Build the `manage-document` edge function**

The function must:

1. call `delete_source_document` or `reset_source_document`
2. call `deleteProjectionForSourceFromArango` or `resetProjectionForSourceInArango`
3. return `502` if Postgres succeeded but Arango cleanup failed

**Step 2: Add automated tests**

In `manage-document/index.test.ts`, cover:

- delete success
- reset success
- RPC failure
- Arango cleanup failure returning `502`
- missing auth

**Step 3: Add a shared frontend helper**

In `web/src/lib/edge.ts`:

```ts
export async function manageDocument(
  action: "delete" | "reset",
  sourceUid: string,
): Promise<{ ok: boolean; error?: string }> {
  const resp = await edgeFetch("manage-document", {
    method: "POST",
    body: JSON.stringify({ action, source_uid: sourceUid }),
  });
  return resp.json();
}
```

**Step 4: Update all delete/reset callers**

Replace direct RPC usage in:

- `web/src/pages/useParseWorkbench.tsx`
- `web/src/pages/useAssetsWorkbench.tsx`
- `web/src/pages/useEltWorkbench.tsx`
- `web/src/components/flows/FlowWorkbench.tsx`

**Step 5: Run tests**

Run the new `manage-document` tests plus any affected frontend tests.

Expected: PASS.

**Step 6: Commit**

```bash
git add supabase/functions/manage-document/index.ts supabase/functions/manage-document/index.test.ts web/src/lib/edge.ts web/src/pages/useParseWorkbench.tsx web/src/pages/useAssetsWorkbench.tsx web/src/pages/useEltWorkbench.tsx web/src/components/flows/FlowWorkbench.tsx
git commit -m "feat: route document delete and reset through Arango-aware cleanup"
```

---

### Task 7: Document the projection and verify it end to end

**Files:**
- Modify: `supabase/functions/README.md`
- Modify: `web-docs/src/content/docs/internal/arango-cloud.md`

**Step 1: Document the final collection model**

Add a section that names:

- `blockdata_documents`
- `blockdata_docling_documents`
- `blockdata_blocks`
- `blockdata_runs`
- `blockdata_overlays`

Clarify that:

- original uploaded files stay in Supabase Storage
- Arango stores the full Docling payload, not the raw original binary
- `overlay_uid` is first-class in Postgres and Arango

**Step 2: Document the delete/reset behavior**

Explain that delete/reset clear:

- Docling payloads
- blocks
- runs
- overlays

and that a reset preserves the document metadata row in upload-stage shape.

**Step 3: Smoke test the full flow**

Run the following on a real document:

1. upload document
2. let it parse
3. verify Arango has:
   - document metadata
   - full `doclingdocument_json`
   - block rows
4. create a run
5. verify Arango has run rows and overlay rows with `overlay_uid`
6. perform one overlay review action
7. verify Arango overlay state updates
8. reset document
9. verify Arango removes Docling payload, blocks, runs, and overlays but keeps the document metadata row as `uploaded`
10. delete document
11. verify Arango removes everything for that `source_uid`

**Step 4: Record the results**

Append observed outcomes to the internal Arango doc.

**Step 5: Commit**

```bash
git add supabase/functions/README.md web-docs/src/content/docs/internal/arango-cloud.md
git commit -m "docs: document self-contained Arango docling projection"
```

---

## Verification Checklist

- `public.block_overlays.overlay_uid` exists, is backfilled, and is unique
- `deno test supabase/functions/_shared/arangodb.test.ts --allow-env` passes
- `conversion-complete` syncs full `doclingdocument_json` to Arango
- Arango blocks preserve `source_uid`, `conv_uid`, and `block_uid`
- Arango run rows preserve `run_id`, `source_uid`, and `conv_uid`
- Arango overlay rows preserve `overlay_uid`, `run_id`, `block_uid`, and current overlay state
- worker and review flows keep overlays in Arango synchronized after mutations
- `manage-document` returns `502` when Arango cleanup fails after Postgres success
- delete and reset remove Arango Docling payloads, blocks, runs, and overlays for the target `source_uid`
- `ensureCollection` skips redundant collection checks after the first successful call

## Acceptance Criteria

- Arango is self-contained enough to reconstruct a full Docling-parsed document from its own data alone
- `source_uid`, `conv_uid`, `block_uid`, `run_id`, and `overlay_uid` are all present in the Arango projection
- Original uploaded files remain in Supabase Storage, not Arango
- Runs and overlays are no longer treated as future work for Arango; they are part of the required projection
- Delete and reset clean up all Arango records tied to the source document
- The projection remains Docling-specific by design for the current system state

## What This Plan Does Not Cover

Future work for separate plans:

- parser-agnostic projection for non-Docling parsed documents
- raw original-file replication into Arango
- graph edges between documents, blocks, runs, overlays, projects, or citations
- ArangoSearch views or full-text indexes
- replacement of existing `source_uid`, `conv_uid`, or `block_uid` formats
