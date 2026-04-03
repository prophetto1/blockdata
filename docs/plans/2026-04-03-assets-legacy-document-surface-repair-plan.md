# Assets Legacy Document Surface Repair Implementation Plan

**Goal:** Restore the Assets file list for historical project documents that still live in `source_documents` with `document_surface = NULL`, and eliminate the confusing “documents exist but Files disappears” behavior in the Assets workbench.

**Architecture:** Keep `public.source_documents` and `public.view_documents` as the Assets list spine. Repair legacy `uploads/%` rows in-place with one additive data migration that classifies them as `document_surface = 'assets'`. Preserve the current platform-api upload path, which already writes `document_surface = 'assets'` for new Assets uploads. On the frontend, keep the Files pane mounted even when a project has zero asset rows so the workbench renders a stable empty state instead of removing the file list surface.

**Tech Stack:** Supabase Postgres migrations, React + TypeScript + Vite, pytest, Vitest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-04-03

### Platform API

No platform API endpoints are added or modified.

Existing Assets upload endpoints remain the authoritative write path and are reused as-is:

- `POST /storage/uploads`
- `POST /storage/uploads/{reservation_id}/complete`

Reason: the live upload path already persists `document_surface = 'assets'`; the defect is historical data classification plus Assets workbench presentation, not an active request-contract failure.

### Observability

No new traces, metrics, or structured logs.

Justification: this fix adds no new owned runtime seam. The database work is a one-time backfill migration, and the frontend change is local pane behavior in an already-mounted route. Existing upload-path observability remains unchanged.

Observability attribute rules remain unchanged:

- Allowed attributes: existing storage route attributes only
- Forbidden in trace or metric attributes: `user_id`, `email`, `source_uid`, raw filenames, raw storage object keys

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260403110000_assets_legacy_document_surface_backfill.sql` | Backfills `public.source_documents.document_surface` to `'assets'` for legacy `uploads/%` rows that are still `NULL` | Yes - updates historical Assets-owned metadata rows in place |

Migration contract:

- Update only rows where `document_surface IS NULL` and `source_locator LIKE 'uploads/%'`.
- Do not rewrite rows already classified as `assets` or `pipeline-services`.
- Do not invent `storage_object_id` values for historical rows that still lack a storage bridge.
- Do not broaden `view_documents`; the existing `document_surface = 'assets'` filter remains the intended read contract.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** `0`

**New components:** `0`

**New hooks:** `0`

**New libraries/services:** `0`

**Modified pages/hooks:** `1`

| File | What changes |
|------|--------------|
| `web/src/pages/useAssetsWorkbench.tsx` | Keep the Files tab mounted regardless of `docs.length`, so zero-assets states render the existing `DocumentFileTable` empty state instead of removing the pane |

**Modified test files:** `2`

| File | What changes |
|------|--------------|
| `services/platform-api/tests/test_storage_source_documents.py` | Add migration-content assertions for the legacy `uploads/%` backfill contract |
| `web/src/pages/ProjectAssetsPage.test.tsx` | Update pane-layout assertions so the Assets workbench contract requires a persistent Files tab |

## Source of Truth

1. `docs/plans/2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`
2. The current Assets route implementation in `web/src/pages/useAssetsWorkbench.tsx` and `web/src/lib/projectDocuments.ts`
3. The current storage namespace migrations in `supabase/migrations/20260402193000_storage_namespace_metadata_foundation.sql` and `supabase/migrations/20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql`

## Verified Current State

1. Assets reads `view_documents` filtered by `project_id` and `document_surface = 'assets'`.
2. `view_documents` already exposes `source_documents.document_surface` directly, so reclassifying historical rows is sufficient to make them visible to the existing Assets query.
3. The Assets workbench currently removes the Files tab when `docs.length === 0`, which makes zero-assets projects look broken instead of empty.
4. New Assets uploads already persist `document_surface = 'assets'` through `services/platform-api/app/api/routes/storage.py`.
5. The current live data problem is dominated by historical `source_documents` rows with `document_surface IS NULL` and `source_locator LIKE 'uploads/%'`.

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. Assets continues to read from `public.view_documents`, not directly from `public.storage_objects`.
2. Legacy `source_documents` rows whose locator matches `uploads/%` are treated as historical Assets-owned documents and must be repaired in data, not papered over with a broader frontend query.
3. The Assets Files pane must stay visible even when there are zero asset rows; zero assets is an empty-state UX, not a missing-pane UX.
4. The global project `doc_count` surfaced by `list_projects_overview` and `list_projects_overview_v2` is not redefined in this plan.
5. Pipeline-service rows remain excluded from the Assets list contract.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. A project whose legacy `source_documents` rows all match `uploads/%` and currently have `document_surface IS NULL` shows those rows in Assets after the migration runs.
2. A project with zero Assets rows still renders the Files pane and shows the `DocumentFileTable` empty state instead of removing the file list surface.
3. A project that only has pipeline-service documents does not gain false-positive Assets rows from this repair.
4. A newly uploaded Assets file still appears through the unchanged `document_surface = 'assets'` query path.

### Locked Platform API Surface

#### New platform API endpoints: `0`

#### Modified platform API endpoints: `0`

#### Existing platform API endpoints reused as-is: `2`

1. `POST /storage/uploads`
2. `POST /storage/uploads/{reservation_id}/complete`

### Locked Observability Surface

#### New traces: `0`

#### New metrics: `0`

#### New structured logs: `0`

Reason: no new owned runtime seam is introduced by this plan.

### Locked Inventory Counts

#### Database

- New migrations: `1`
- Modified existing migrations: `0`

#### Backend runtime

- Modified runtime modules: `0`

#### Frontend runtime

- Modified existing pages/hooks: `1`
- New pages/hooks/components/services: `0`

#### Tests

- New test modules: `0`
- Modified existing test modules: `2`

### Locked File Inventory

#### New files

- `supabase/migrations/20260403110000_assets_legacy_document_surface_backfill.sql`

#### Modified files

- `services/platform-api/tests/test_storage_source_documents.py`
- `web/src/pages/useAssetsWorkbench.tsx`
- `web/src/pages/ProjectAssetsPage.test.tsx`

## Frozen Seam Contract

The compatibility seam for this repair is the current Assets read path:

- `public.source_documents` remains the authoritative Assets metadata store
- `public.view_documents` remains the read model
- `web/src/lib/projectDocuments.ts` continues to require `document_surface = 'assets'`

This plan is not allowed to:

- repoint Assets to `storage_objects`
- add a frontend `OR document_surface IS NULL` escape hatch
- reclassify pipeline-service rows as Assets rows
- change the meaning of project-level `doc_count`

## Explicit Risks Accepted In This Plan

1. Historical `uploads/%` rows may still lack `storage_object_id`; this repair restores Assets visibility without retrofitting missing storage-object lineage.
2. Projects whose generic project count still includes pipeline-service documents may continue to show a higher shell-level “docs” count than the Assets file list. This plan fixes the disappearing Files surface and legacy Assets visibility, not the broader project-count semantics.

## Task Breakdown

## Task 1: Add the failing migration-contract test for legacy uploads backfill

**File(s):** `services/platform-api/tests/test_storage_source_documents.py`

**Step 1:** Add a failing test that requires exactly one `*_assets_legacy_document_surface_backfill.sql` migration in `supabase/migrations/`.
**Step 2:** Assert that the migration updates only `public.source_documents` rows where `document_surface IS NULL` and `source_locator LIKE 'uploads/%'`.
**Step 3:** Assert that the SQL does not modify already-classified `assets` or `pipeline-services` rows and does not write `storage_object_id`.

**Test command:** `cd services/platform-api && pytest -q tests/test_storage_source_documents.py`
**Expected output:** the new migration-contract assertion fails before the migration exists, then passes after the migration is added.

**Commit:** `test(storage): lock legacy assets surface backfill contract`

## Task 2: Add the legacy Assets document-surface backfill migration

**File(s):** `supabase/migrations/20260403110000_assets_legacy_document_surface_backfill.sql`

**Step 1:** Create the migration as an additive data repair only; do not alter schema or recreate views.
**Step 2:** Backfill `document_surface = 'assets'` for `public.source_documents` rows with `document_surface IS NULL` and `source_locator LIKE 'uploads/%'`.
**Step 3:** Keep the SQL idempotent so re-running the migration produces no additional changes after the first pass.
**Step 4:** Do not classify any locator pattern other than legacy `uploads/%` in this migration.

**Test command:** `cd services/platform-api && pytest -q tests/test_storage_source_documents.py`
**Expected output:** `... passed` with the new migration-content assertions satisfied.

**Commit:** `fix(storage): backfill legacy assets document_surface values`

## Task 3: Lock the Assets workbench to a persistent Files pane

**File(s):** `web/src/pages/useAssetsWorkbench.tsx`

**Step 1:** Remove the effect that adds and removes the Files tab based on `docs.length`.
**Step 2:** Make the Files tab part of the stable Assets workbench pane contract so it remains mounted for both populated and empty projects.
**Step 3:** Keep the current `DocumentFileTable` rendering path and rely on its empty-state copy for zero-assets projects.

**Test command:** `cd web && npm run test -- src/pages/ProjectAssetsPage.test.tsx`
**Expected output:** the page test fails before the pane contract is updated, then passes with a persistent Files pane.

**Commit:** `fix(web): keep assets files pane visible for empty projects`

## Task 4: Update frontend tests to lock the new Assets pane contract

**File(s):** `web/src/pages/ProjectAssetsPage.test.tsx`

**Step 1:** Update the pane-layout assertion so the Assets workbench contract includes a Files pane by default.
**Step 2:** Preserve the existing file-table styling assertion so the Files pane still renders the compact parse table.
**Step 3:** Verify that the page renders without requiring existing docs to mount the Files pane.

**Test command:** `cd web && npm run test -- src/pages/ProjectAssetsPage.test.tsx`
**Expected output:** `3 passed` or equivalent passing output for the Project Assets page test file.

**Commit:** `test(web): lock assets files pane visibility contract`

## Task 5: Run the focused verification sweep

**File(s):** `services/platform-api/tests/test_storage_source_documents.py`, `web/src/pages/ProjectAssetsPage.test.tsx`

**Step 1:** Run the targeted backend migration-contract test.
**Step 2:** Run the targeted frontend Assets page test.
**Step 3:** If both pass, optionally run the existing Assets sync test to confirm the upload-refresh flow still works with the stable Files pane.

**Test command:** `cd services/platform-api && pytest -q tests/test_storage_source_documents.py && cd ../../web && npm run test -- src/pages/ProjectAssetsPage.test.tsx src/pages/project-assets-sync.test.tsx`
**Expected output:** targeted backend and frontend suites pass with no regression in Assets upload refresh behavior.

**Commit:** `test(storage): verify legacy assets visibility repair`

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked migration exists exactly as specified and only repairs legacy `uploads/%` rows with `document_surface IS NULL`.
2. The Assets route still reads through the existing `document_surface = 'assets'` query path with no null-surface fallback logic.
3. The Files pane remains visible for zero-assets projects and renders the existing file-table empty state.
4. The locked inventory counts and file inventory match the actual implementation.
5. The targeted backend and frontend verification commands in this plan pass.
