# Parse Runtime Hardening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the non-atomic failure modes in `conversion-complete` that leave orphaned rows across `blocks`, `conversion_parsing`, and `conversion_representations`, make the callback idempotent for retries, fix block cleanup in `trigger-parse` for re-parse, and correct the frontend's empty-blocks error rendering.

**Architecture:** Backend fixes only touch `conversion-complete/index.ts` and `trigger-parse/index.ts`. One frontend fix in `parseArtifacts.ts` + `useParseWorkbench.tsx`. One optional cache hygiene fix. No schema changes needed — the `UNIQUE(source_uid)` constraint on `conversion_parsing` and `PRIMARY KEY(block_uid)` on `blocks` already provide the conflict targets for upsert.

**Tech Stack:** Deno edge functions (Supabase), PostgreSQL, React

---

## Problem Summary

The parse pipeline has four verified issues:

1. **Non-idempotent block insertion** — `conversion-complete` uses `.insert()` for blocks (line 413). If the conversion service retries the callback, duplicate blocks are created. `block_uid` is deterministic (`${conv_uid}:${idx}`), so `.upsert()` on `block_uid` is the fix.

2. **Incomplete failure cleanup** — The inner catch block (line 511) marks `source_documents.status = "parse_failed"` but does not clean up the three tables already written:
   - `conversion_parsing` — upserted at line 371 with `conv_status: "success"`
   - `blocks` — inserted at line 413
   - `conversion_representations` — upserted at lines 418-452

   This leaves the DB in an inconsistent state: `source_documents` says `parse_failed` but `conversion_parsing` says `success` with valid blocks and representations.

3. **Arango sync can crash the error handler** — `syncAssetToArango` in the catch block (line 517) is not wrapped in try-catch. If Arango is unreachable, the intended 200 `{ok: false, status: "parse_failed"}` response becomes an unhandled exception caught by the outer catch (line 542) which returns 400.

4. **Re-parse block cleanup uses potentially stale conv_uid** — `trigger-parse` (line 103) queries `conversion_parsing` for the `conv_uid` to delete blocks. Due to the `UNIQUE(source_uid)` constraint, there is only ever one row per source. However, if that row has `conv_uid: "pending:${source_uid}"` (pre-inserted at line 205 when pipeline_config is set), the delete targets a `conv_uid` that has no matching blocks, so real blocks from the previous parse survive.

5. **Empty blocks rendered as error** — `loadBlocksArtifact` (parseArtifacts.ts:347) returns `error: "No stored blocks..."` when blocks array is empty. The UI renders this identically to real errors. An empty parse result is valid (empty document or blocks still being written).

### Issues from initial draft that were WRONG (removed)

- **Task 5 (widen polling):** Polling during `converting` is sufficient — once a doc leaves `converting`, it hits a terminal status which Realtime delivers. The 5s poll catches all transitions while converting.
- **Task 6 (guard realtime merge):** `payload.new` from Supabase Realtime only contains `source_documents` columns. Absent keys are not spread — JavaScript's `{ ...d, ...updated }` only overwrites keys present in `updated`. Joined view columns (`conv_uid`, `conv_total_blocks`) are never in the payload, so they're never overwritten.
- **Task 9 (cache invalidation on re-parse):** The artifact cache key (parseArtifacts.ts:75) already includes `status`, `conv_uid`, and `conv_total_blocks`. When status changes from `parsed` → `converting`, the key changes automatically. No manual invalidation needed.

---

## Task 1: Make block insertion idempotent

**Files:**
- Modify: `supabase/functions/conversion-complete/index.ts:413`

**Why:** `block_uid` is `${conv_uid}:${idx}` — deterministic per parse. If the callback retries, `.insert()` fails or creates duplicates. `.upsert()` on `block_uid` makes it safe.

**Step 1: Change `.insert()` to `.upsert()`**

```typescript
// Line 413 — BEFORE:
const { error: insErr } = await supabaseAdmin.from("blocks").insert(blockRows);

// AFTER:
const { error: insErr } = await supabaseAdmin.from("blocks").upsert(
  blockRows,
  { onConflict: "block_uid" },
);
```

**Step 2: Verify the existing contract tests still pass**

Run: `cd supabase/functions && deno test conversion-complete/index.test.ts --allow-all`
Expected: 3 tests pass (block_uid format, fast path, extractDoclingBlocks)

**Step 3: Commit**

```bash
git add supabase/functions/conversion-complete/index.ts
git commit -m "fix: make block insertion idempotent via upsert on block_uid"
```

---

## Task 2: Full failure cleanup in conversion-complete catch block

**Files:**
- Modify: `supabase/functions/conversion-complete/index.ts:511-540`

**Why:** The catch block at line 511 currently only updates `source_documents.status` to `parse_failed`. But three other tables may already have rows from this attempt:
- `conversion_parsing` — upserted at line 371 with `conv_status: "success"` and real `conv_uid`
- `blocks` — upserted at line 413
- `conversion_representations` — upserted at lines 418-452

All three must be cleaned up to avoid state divergence.

**Step 1: Add full cleanup before the status update**

Replace the inner catch block (lines 511-540):

```typescript
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);

  // Clean up all rows written during this attempt.
  // Order: blocks (FK on conv_uid) → representations → conversion_parsing.
  await supabaseAdmin.from("blocks").delete().eq("conv_uid", conv_uid);
  await supabaseAdmin.from("conversion_representations").delete().eq("source_uid", source_uid);
  await supabaseAdmin.from("conversion_parsing").delete().eq("source_uid", source_uid);

  await supabaseAdmin
    .from("source_documents")
    .update({ status: "parse_failed", error: msg })
    .eq("source_uid", source_uid);

  if (arangoConfig) {
    try {
      await syncAssetToArango(arangoConfig, {
        source_uid,
        project_id: docRow.project_id ?? null,
        owner_id: docRow.owner_id,
        source_type: docRow.source_type,
        doc_title: docRow.doc_title,
        source_locator: docRow.source_locator,
        source_filesize: docRow.source_filesize ?? null,
        source_total_characters: docRow.source_total_characters ?? null,
        status: "parse_failed",
        conversion_job_id: docRow.conversion_job_id ?? null,
        error: msg,
        uploaded_at: docRow.uploaded_at ?? null,
        updated_at: docRow.updated_at ?? null,
        conv_uid,
        conv_locator: docling_key,
        conv_status: "failed",
        conv_representation_type: "doclingdocument_json",
        pipeline_config: effectivePipelineConfig ?? {},
        block_count: null,
      });
    } catch (arangoErr) {
      console.error("conversion-complete: Arango sync in error path failed:", arangoErr);
    }
  }

  return json(200, { ok: false, status: "parse_failed", error: msg });
}
```

Note: This also fixes Task 3 (Arango sync wrapped in try-catch) in the same change.

**Step 2: Verify contract tests still pass**

Run: `cd supabase/functions && deno test conversion-complete/index.test.ts --allow-all`

**Step 3: Commit**

```bash
git add supabase/functions/conversion-complete/index.ts
git commit -m "fix: clean up blocks, representations, and conversion_parsing on parse failure"
```

---

## Task 3: Fix re-parse block cleanup in trigger-parse

**Files:**
- Modify: `supabase/functions/trigger-parse/index.ts:102-107`

**Why:** Line 103 queries `conversion_parsing` for `conv_uid` to delete matching blocks. Due to `UNIQUE(source_uid)`, there is at most one row. But if `trigger-parse` previously pre-inserted a row with `conv_uid: "pending:${source_uid}"` (line 205) and the conversion failed before `conversion-complete` could upsert the real hash, the query returns the pending sentinel. The delete targets `blocks WHERE conv_uid = 'pending:xxx'` — which matches nothing, leaving real blocks behind.

**Step 1: Rewrite cleanup to handle the pending sentinel**

Replace lines 102-107:

```typescript
// Clean up stale DB rows from previous conversion attempts (re-parse).
// The conversion_parsing row may have a pending:* sentinel conv_uid
// (from the pre-insert at line 205) or a real content hash. Fetch it,
// then delete blocks for the real conv_uid if it differs.
const { data: prevConv } = await supabaseAdmin
  .from("conversion_parsing")
  .select("conv_uid")
  .eq("source_uid", source_uid)
  .maybeSingle();
const prevConvUid = prevConv?.conv_uid ?? null;

// Delete blocks: try the stored conv_uid. If it's a pending sentinel,
// there are no blocks to delete (which is correct — the conversion
// never completed). If it's a real hash, this cleans up the old blocks.
if (prevConvUid) {
  await supabaseAdmin.from("blocks").delete().eq("conv_uid", prevConvUid);
}
await supabaseAdmin.from("conversion_representations").delete().eq("source_uid", source_uid);
await supabaseAdmin.from("conversion_parsing").delete().eq("source_uid", source_uid);
```

Wait — re-reading the actual issue: the problem is when `conversion-complete` DID run successfully (setting the real hash), then the user re-parses, and `trigger-parse` pre-inserts a new pending row (line 200-219). But that pre-insert happens AFTER the cleanup (lines 102-107). So at cleanup time, the row still has the real hash. The cleanup should work correctly in that case.

The actual failure mode is: user triggers parse → pre-insert pending row → conversion fails → user retries → cleanup reads pending sentinel → blocks from previous SUCCESSFUL parse not deleted.

But this can only happen if there was a successful parse, then the pending row overwrote it. Let me re-check: the pre-insert at line 200 is a `.insert()`, not `.upsert()`. With a `UNIQUE(source_uid)` constraint, this would FAIL if a row already exists. And the cleanup at lines 102-107 deletes conversion_parsing BEFORE the pre-insert.

So the actual flow is:
1. Previous successful parse: `conversion_parsing` has `conv_uid = "real_hash"`
2. User re-parses
3. Line 103: query returns `conv_uid = "real_hash"` ✓
4. Line 103: delete blocks where `conv_uid = "real_hash"` ✓
5. Line 107: delete conversion_parsing row ✓
6. Line 200: insert pending row ✓ (no conflict, row was deleted)

This actually works. The only broken case is the inline query syntax — the `__none__` fallback when `.maybeSingle()` returns null (no prior row). That's harmless.

Let me re-examine whether there's actually a bug here. The current code:

```typescript
await supabaseAdmin.from("blocks").delete().eq("conv_uid",
  (await supabaseAdmin.from("conversion_parsing").select("conv_uid").eq("source_uid", source_uid).maybeSingle()).data?.conv_uid ?? "__none__"
);
```

This is functionally correct but fragile. The real improvement is readability and robustness. Let me downgrade this to a minor cleanup rather than a bug fix.

**Revised Step 1: Refactor for clarity (no behavior change)**

```typescript
// Clean up stale DB rows from previous conversion attempts (re-parse).
const { data: prevConv } = await supabaseAdmin
  .from("conversion_parsing")
  .select("conv_uid")
  .eq("source_uid", source_uid)
  .maybeSingle();
if (prevConv?.conv_uid) {
  await supabaseAdmin.from("blocks").delete().eq("conv_uid", prevConv.conv_uid);
}
await supabaseAdmin.from("conversion_representations").delete().eq("source_uid", source_uid);
await supabaseAdmin.from("conversion_parsing").delete().eq("source_uid", source_uid);
```

**Step 2: Commit**

```bash
git add supabase/functions/trigger-parse/index.ts
git commit -m "refactor: clarify re-parse cleanup — extract conv_uid query, remove __none__ fallback"
```

---

## Task 4: Treat empty blocks as info, not error

**Files:**
- Modify: `web/src/pages/parseArtifacts.ts:344-353`
- Modify: `web/src/pages/useParseWorkbench.tsx:346-351`

**Why:** `loadBlocksArtifact` returns `error: "No stored blocks were found..."` when the blocks array is empty. The blocks tab renders this with the same `DocumentPreviewMessage` component used for real errors. But empty blocks is valid — the document may have no extractable content, or blocks may still be propagating. The `error` field should be `null`; the UI should show a neutral info message.

**Step 1: Change `loadBlocksArtifact` to return null error for empty blocks**

In `parseArtifacts.ts`, replace lines 347-353:

```typescript
// BEFORE:
if (blocks.length === 0) {
  return {
    blocks: [],
    rawItems: [],
    loading: false,
    error: 'No stored blocks were found for this parsed document.',
  };
}

// AFTER:
if (blocks.length === 0) {
  return {
    blocks: [],
    rawItems: [],
    loading: false,
    error: null,
  };
}
```

**Step 2: Update the blocks tab to show info message for empty blocks**

In `useParseWorkbench.tsx`, the existing code at line 346 checks `state.blocks.length === 0` and renders `DocumentPreviewMessage`. Keep the check but update the message to be informational:

```typescript
if (!isRawDocling && state.blocks.length === 0) {
  return (
    <DocumentPreviewShell doc={doc}>
      <DocumentPreviewMessage
        message="No blocks found. The document may be empty or blocks are still being written."
      />
    </DocumentPreviewShell>
  );
}
```

**Step 3: Add a test for the new behavior**

In `web/src/pages/parseArtifacts.test.ts` (or the existing test file for parseArtifacts — check `web/src/pages/useExtractWorkbench.test.ts` for test patterns):

```typescript
import { primeParseArtifactsForDocument } from './parseArtifacts';

test('empty blocks returns null error', async () => {
  const mockDoc = { source_uid: 'test', status: 'parsed', conv_uid: 'abc' } as any;
  const result = await primeParseArtifactsForDocument(mockDoc, {
    loadDocumentViewMode: async () => 'stored_blocks' as const,
    getArtifactLocator: async () => null,
    resolveSignedUrlForLocators: async () => ({ url: null, error: null }),
    fetchText: async () => '',
    fetchBlocks: async () => [],
  });
  expect(result.blocks.error).toBeNull();
  expect(result.blocks.blocks).toEqual([]);
});
```

**Step 4: Run the test**

Run: `cd web && npx vitest run src/pages/parseArtifacts`
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/pages/parseArtifacts.ts web/src/pages/useParseWorkbench.tsx
git commit -m "fix: treat empty blocks as informational, not as an error"
```

---

## Task 5: Cap artifact cache size (optional, low priority)

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx:724`

**Why:** `artifactsCacheRef` grows by one entry per document viewed. In normal use this is bounded by project size, but there's no hard cap. A simple insertion-order eviction prevents unbounded growth in long-lived sessions.

**Step 1: Add eviction after cache set**

After line 724 (`artifactsCacheRef.current.set(cacheKey, bundle)`):

```typescript
// Cap cache — evict oldest entries (insertion order) beyond limit.
const MAX_ARTIFACT_CACHE = 50;
if (artifactsCacheRef.current.size > MAX_ARTIFACT_CACHE) {
  const iter = artifactsCacheRef.current.keys();
  for (let i = artifactsCacheRef.current.size - MAX_ARTIFACT_CACHE; i > 0; i--) {
    const oldest = iter.next().value;
    if (oldest) artifactsCacheRef.current.delete(oldest);
  }
}
```

**Step 2: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx
git commit -m "fix: cap artifact cache at 50 entries with insertion-order eviction"
```

---

## Summary

| Task | File | Fix | Priority |
|------|------|-----|----------|
| 1 | conversion-complete/index.ts:413 | `.insert()` → `.upsert("block_uid")` | Critical |
| 2 | conversion-complete/index.ts:511-540 | Clean up blocks + representations + conversion_parsing on failure; wrap Arango in try-catch | Critical |
| 3 | trigger-parse/index.ts:102-107 | Refactor conv_uid lookup for clarity | Minor |
| 4 | parseArtifacts.ts:347 + useParseWorkbench.tsx:346 | Empty blocks → null error + info message | Medium |
| 5 | useParseWorkbench.tsx:724 | Insertion-order cache eviction at 50 | Low |
