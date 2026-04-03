# Index Builder One-Page Operational Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stabilize the existing one-page Index Builder so file membership edits persist correctly, discard restores the saved state, and the workbench can survive reload and deep-link entry without reintroducing the rejected multi-page split.

**Architecture:** Single-route React workbench. The page remains mounted at `/app/pipeline-services/index-builder` and keeps list/detail behavior inside one component. Selection state moves from local-only React state to same-route search params. Dirty/save/discard behavior moves from ad-hoc boolean toggles to saved-snapshot comparison.

**Tech stack:** Vite + React + TypeScript + React Router on the frontend. Vitest for frontend tests. FastAPI + Python on the backend. Existing pipeline APIs, in-process pipeline worker startup, Supabase-backed records, and existing object-storage upload/download flow remain unchanged.

## Pre-Implementation Contract

No major product, API, observability, routing, or inventory decision may be improvised during implementation. If any locked item below needs to change, implementation must stop and this plan must be revised first.

## Manifest

### Platform API

No platform API changes.

The frontend continues to consume the existing endpoints only:

- `GET /pipelines/{pipeline_kind}/sources`
- `GET /pipelines/{pipeline_kind}/source-sets`
- `POST /pipelines/{pipeline_kind}/source-sets`
- `GET /pipelines/{pipeline_kind}/source-sets/{source_set_id}`
- `PATCH /pipelines/{pipeline_kind}/source-sets/{source_set_id}`
- `POST /pipelines/{pipeline_kind}/jobs`
- `GET /pipelines/{pipeline_kind}/jobs/latest`
- `GET /pipelines/jobs/{job_id}`
- `GET /pipelines/jobs/{job_id}/deliverables`
- `GET /pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download`
- `POST /storage/uploads`
- `POST /storage/uploads/{reservation_id}/complete`

No request or response contract changes. No new routes. No payload changes.

### Observability

No observability changes.

Existing backend route spans, worker spans, metrics, and failure recording remain the source of truth:

- route spans in `services/platform-api/app/api/routes/pipelines.py`
- worker spans and metrics in `services/platform-api/app/workers/pipeline_jobs.py`
- existing pipeline metrics emitted by the current backend pipeline flow

This plan does not add new spans, metrics, frontend telemetry, or logs.

### Database Migrations

No database migrations.

### Edge Functions

No edge function changes.

### Frontend Surface Area

**Route shape:** one existing route, unchanged path

- `/app/pipeline-services/index-builder`

**Modified workbench files:** `5`

| File | Purpose |
|---|---|
| `web/src/pages/IndexBuilderPage.tsx` | Replace local-only selected-job state with search-param-backed selection on the same route |
| `web/src/pages/IndexBuilderPage.test.tsx` | Add one-page URL-state and invalid-param coverage |
| `web/src/hooks/useIndexBuilderJob.ts` | Replace manual dirty/discard handling with saved snapshot orchestration |
| `web/src/hooks/usePipelineSourceSet.ts` | Add narrow restore/replace-selection support for ordered membership state |
| `web/src/hooks/useIndexBuilderList.ts` | Remove stale split-route navigation helpers so the hook matches the one-page workbench |

**New test files:** `2`

| File | Purpose |
|---|---|
| `web/src/hooks/useIndexBuilderJob.test.ts` | Direct hook coverage for dirty state, discard restore, and save-before-run behavior |
| `web/src/hooks/usePipelineSourceSet.test.ts` | Direct hook coverage for ordered membership replacement and restore behavior |

**Preserved files:** `14`

| File | Contract |
|---|---|
| `web/src/router.tsx` | Route path remains `/app/pipeline-services/index-builder` |
| `web/src/lib/pipelineService.ts` | Existing API client and upload/download flow remain unchanged |
| `web/src/lib/pipelineSourceSetService.ts` | Existing source-set API client remains unchanged |
| `web/src/hooks/usePipelineJob.ts` | Existing latest-job polling and trigger behavior remain unchanged |
| `web/src/components/pipelines/IndexJobsList.tsx` | Existing jobs list UI is reused as-is |
| `web/src/components/pipelines/IndexJobStatusChip.tsx` | Existing status chip reused as-is |
| `web/src/components/pipelines/IndexJobFilesTab.tsx` | Existing files UI reused as-is |
| `web/src/components/pipelines/IndexJobConfigTab.tsx` | Remains read-only placeholder UI |
| `web/src/components/pipelines/IndexJobRunsTab.tsx` | Existing progress UI reused as-is |
| `web/src/components/pipelines/IndexJobArtifactsTab.tsx` | Existing artifact download UI reused as-is |
| `services/platform-api/app/api/routes/pipelines.py` | Existing route behavior unchanged |
| `services/platform-api/app/services/pipeline_source_sets.py` | Existing source-set persistence unchanged |
| `services/platform-api/app/workers/pipeline_jobs.py` | Existing worker behavior unchanged |
| `services/platform-api/app/pipelines/markdown_index_builder.py` | Existing pipeline artifact generation unchanged |

## Frozen Seam Contract

### What is being replaced

1. `IndexBuilderPage` local `selectedJobId` state that disappears on reload or direct entry.
2. `useIndexBuilderJob` manual `hasUnsavedChanges` toggles that do not reflect saved-versus-current file membership.
3. `useIndexBuilderJob.discardChanges()` behavior that restores only the title, not the saved source membership.
4. `useIndexBuilderList` stale split-route navigation helpers inherited from the abandoned multi-page direction.

### What replaces it

1. Same-route search-param selection:
   - `?job=<sourceSetId>` for existing job detail
   - `?job=new` for draft creation
   - missing or blank `job` param for list view
2. Saved snapshot comparison in `useIndexBuilderJob`:
   - saved label
   - saved ordered source UID list
   - saved source-set ID
3. Narrow ordered-membership restore support in `usePipelineSourceSet`, used by discard behavior.
4. One-page page-level selection handlers that update the search param instead of navigating to other routes.

### Compatibility rules

1. The route path remains `/app/pipeline-services/index-builder`.
2. The implementation stays one-page. No `IndexBuilderListPage`, `IndexBuilderJobPage`, `/new`, or `/:jobId` routes are introduced.
3. Existing backend route, worker, storage upload, and deliverable download contracts remain unchanged.
4. Existing `IndexJob*` visual components remain untouched in this remediation.
5. Existing `usePipelineJob` behavior remains untouched in this remediation.
6. `useIndexBuilderList` may shrink to refresh/data responsibilities only; page-level selection belongs to `IndexBuilderPage`.

### What must NOT happen

- Do not add new frontend routes.
- Do not add new backend endpoints.
- Do not add migrations.
- Do not change `pipelineService.ts` or `pipelineSourceSetService.ts`.
- Do not expand the config tab into a new editable backend contract.
- Do not fold list fetch error UX hardening, upload error redesign, or run error redesign into this plan unless the plan is revised first.

## Locked Product Decisions

1. Keep the one-page workbench.
2. Keep the route path unchanged.
3. Encode selected job state in search params on the same route, not in path segments.
4. `?job=new` opens the draft flow in the same page.
5. `?job=<sourceSetId>` opens existing detail in the same page.
6. Missing `job` or blank `job` query behaves as list view.
7. Stale, malformed, or cross-project `job` params do not crash the page. They surface the existing detail load error state and allow the user to return to the list.
8. Dirty state must reflect both label edits and ordered file membership edits.
9. Discard for existing jobs restores the last saved snapshot in place. Discard for new jobs returns to the list.
10. Config remains read-only in this plan.

## Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. `/app/pipeline-services/index-builder` still renders the jobs list on first load when no `job` search param is present.
2. Clicking a job row updates the URL to `?job=<sourceSetId>` and opens detail in the same page.
3. Clicking `New Index Job` updates the URL to `?job=new` and opens draft detail in the same page.
4. Loading `/app/pipeline-services/index-builder?job=<validSourceSetId>` opens the corresponding detail view on first render.
5. Loading `/app/pipeline-services/index-builder?job=new` opens a draft job on first render.
6. Loading `/app/pipeline-services/index-builder?job=` behaves as list view.
7. Loading `/app/pipeline-services/index-builder?job=<staleOrInaccessibleId>` renders the existing detail load error state without crashing the page and includes a working return-to-list action.
8. On an existing job, checking or unchecking a file marks the workbench dirty immediately.
9. On an existing job, removing a selected file marks the workbench dirty immediately.
10. On an existing job, `Discard` restores the last saved title and the last saved ordered file membership.
11. On an existing job, `Start run` after file-membership edits persists the edited source set before job creation.
12. On an unchanged existing job, `Start run` can still trigger without unnecessary re-save.
13. The progress and artifact sections continue to work off the existing backend job state and deliverables.
14. New direct tests pass for `useIndexBuilderJob`.
15. New direct tests pass for `usePipelineSourceSet`.
16. Existing `IndexBuilderPage`, `usePipelineJob`, `pipelineService`, and `indexJobStatus` frontend tests continue to pass.
17. Existing pipeline backend tests continue to pass.
18. `cd web && npx tsc -b --noEmit` exits with no errors.
19. One live create/upload/save/run/poll/download flow succeeds against local runtime dependencies.

## Locked Platform API Surface

The following are locked and must remain unchanged:

1. No new pipeline routes.
2. No new storage routes.
3. No request or response shape changes for source-set create, get, update, job create/latest/get, or deliverable download.
4. No changes to project ownership checks on backend routes.
5. No changes to worker startup semantics. The `platform-api` lifespan continues to start the pipeline worker.

## Locked Observability Surface

The following are locked and must remain unchanged:

1. Existing route spans in `pipelines.py`.
2. Existing worker spans, metrics, and failure recording in `pipeline_jobs.py`.
3. Existing artifact-generation metrics and stage reporting.
4. No new frontend telemetry requirements.

## Locked Inventory Counts

### Backend

- Modified backend files: `0`
- New endpoints: `0`
- New migrations: `0`
- Edge function changes: `0`

### Frontend

- New files: `2`
- Modified files: `5`
- Preserved relevant files: `14`
- Deleted files: `0`
- Route path changes: `0`

## Locked File Inventory

### New files

- `web/src/hooks/useIndexBuilderJob.test.ts`
- `web/src/hooks/usePipelineSourceSet.test.ts`

### Modified files

- `web/src/pages/IndexBuilderPage.tsx`
- `web/src/pages/IndexBuilderPage.test.tsx`
- `web/src/hooks/useIndexBuilderJob.ts`
- `web/src/hooks/usePipelineSourceSet.ts`
- `web/src/hooks/useIndexBuilderList.ts`

### Preserved files

- `web/src/router.tsx`
- `web/src/lib/pipelineService.ts`
- `web/src/lib/pipelineSourceSetService.ts`
- `web/src/hooks/usePipelineJob.ts`
- `web/src/components/pipelines/IndexJobsList.tsx`
- `web/src/components/pipelines/IndexJobStatusChip.tsx`
- `web/src/components/pipelines/IndexJobFilesTab.tsx`
- `web/src/components/pipelines/IndexJobConfigTab.tsx`
- `web/src/components/pipelines/IndexJobRunsTab.tsx`
- `web/src/components/pipelines/IndexJobArtifactsTab.tsx`
- `services/platform-api/app/api/routes/pipelines.py`
- `services/platform-api/app/services/pipeline_source_sets.py`
- `services/platform-api/app/workers/pipeline_jobs.py`
- `services/platform-api/app/pipelines/markdown_index_builder.py`

### Deleted files

None.

## Explicit Risks Accepted In This Plan

1. **List fetch error UX remains out of scope.** The current workbench list path does not receive new loading/error UX treatment in this plan. This remediation is limited to the verified dirty/discard/URL-state findings.
2. **Save, upload, and run failure presentation remain out of scope.** Existing hook/service errors may still surface as current generic messages. This plan does not redesign those error states.
3. **Config remains read-only.** `IndexJobConfigTab` continues to display current placeholder configuration metadata only.
4. **Invalid `?job` values, including stale, malformed, or cross-project job params, use the existing generic detail load error state.** This plan does not introduce a custom not-found screen or a special cross-project permission UX.

## Current Implementation Reconstruction

The live app currently mounts a single workbench route at `/app/pipeline-services/index-builder` and renders the one-page workbench from `web/src/pages/IndexBuilderPage.tsx`. The page shows the jobs list first, then swaps into a detail surface on the same page when a job is selected.

The detail surface composes:

- `useIndexBuilderJob`
- `usePipelineSourceSet`
- `usePipelineJob`
- `IndexJobFilesTab`
- `IndexJobConfigTab`
- `IndexJobRunsTab`
- `IndexJobArtifactsTab`

The backend/runtime path already exists:

- source list and source-set APIs in `services/platform-api/app/api/routes/pipelines.py`
- source-set persistence in `services/platform-api/app/services/pipeline_source_sets.py`
- job execution in `services/platform-api/app/workers/pipeline_jobs.py`
- Markdown index generation in `services/platform-api/app/pipelines/markdown_index_builder.py`

The platform API app starts the pipeline worker during FastAPI lifespan startup, so a normal local `platform-api` run is sufficient for end-to-end verification.

## Verified Findings Tracker

| # | Severity | Finding | Verification | Scope of Fix | Disposition |
|---|---|---|---|---|---|
| 1 | P1 | File membership edits never become dirty state | Verified in `web/src/hooks/useIndexBuilderJob.ts`, `web/src/hooks/usePipelineSourceSet.ts`, and `web/src/components/pipelines/IndexJobFilesTab.tsx` | `useIndexBuilderJob`, `usePipelineSourceSet`, tests | Fix |
| 2 | P1 | Discard does not restore the saved file set | Verified in `web/src/hooks/useIndexBuilderJob.ts` and `web/src/pages/IndexBuilderPage.tsx` | `useIndexBuilderJob`, `usePipelineSourceSet`, tests | Fix |
| 3 | P2 | Detail state is lost on reload because it is not URL-backed | Verified in `web/src/pages/IndexBuilderPage.tsx` and `web/src/router.tsx` | `IndexBuilderPage`, tests, one-page URL state only | Fix |

## Root Cause Summary

1. `useIndexBuilderJob` tracks `hasUnsavedChanges` as a manually toggled boolean instead of deriving it from saved-versus-current state.
2. `usePipelineSourceSet` owns ordered source membership, but `useIndexBuilderJob` has no saved membership snapshot to compare against or restore from.
3. The page stores `selectedJobId` only in component state, so reload and direct entry cannot restore detail state.
4. `useIndexBuilderList` still exposes stale route-navigation helpers from the abandoned multi-page direction.

## Tasks

### Task 1: Lock the Verified Failures With Direct Regression Tests

**Files**

- Create `web/src/hooks/useIndexBuilderJob.test.ts`
- Create `web/src/hooks/usePipelineSourceSet.test.ts`
- Modify `web/src/pages/IndexBuilderPage.test.tsx`

**Intent**

Add failing regression coverage for the verified findings before changing runtime behavior.

**Step 1: Write the failing tests**

Add direct hook tests for:

- existing job file toggle marks dirty
- existing job file removal marks dirty
- `startRun()` persists edited membership before trigger
- `discardChanges()` restores saved title and ordered membership

Add direct `usePipelineSourceSet` tests for:

- replacing selection preserves caller-provided order
- restoring selection replaces the current edited selection exactly

Add one-page page tests for:

- `?job=<validId>` opens detail on first render
- `?job=new` opens draft on first render
- missing or blank `job` param shows list
- stale or inaccessible `job` param renders detail load error safely
- back-to-list clears the search param

**Step 2: Run tests to verify they fail**

```bash
cd web && npx vitest run src/hooks/useIndexBuilderJob.test.ts src/hooks/usePipelineSourceSet.test.ts src/pages/IndexBuilderPage.test.tsx
```

Expected before implementation:

- New dirty/discard/search-param/source-set tests fail.
- Existing preexisting page assertions continue to pass.

**Step 3: Confirm failures map to the findings**

- Dirty-state failures point at file-membership edits not propagating into saved-versus-current comparison.
- Discard failures point at saved membership not being restored.
- Search-param failures point at missing URL-backed selection behavior.
- Source-set tests prove ordered membership restore is not yet directly supported.

**Commit:** `test(index-builder): add one-page hardening regression coverage`

### Task 2: Add Ordered Membership Restore Primitives To `usePipelineSourceSet`

**Files**

- Modify `web/src/hooks/usePipelineSourceSet.ts`
- Modify `web/src/hooks/usePipelineSourceSet.test.ts`

**Intent**

Give the orchestration layer one narrow, explicit way to restore saved ordered file membership without exposing raw internal setters.

**Step 1: Extend the hook API narrowly**

Add only the minimal restore-oriented API needed by the workbench, for example:

- `replaceSelection(sourceUids: string[])`

Requirements:

- preserves the caller-provided order
- replaces current selection rather than merging
- does not mutate unrelated hook state

**Step 2: Run focused tests to verify they fail before implementation**

```bash
cd web && npx vitest run src/hooks/usePipelineSourceSet.test.ts
```

Expected before implementation:

- new replacement/restore tests fail

**Step 3: Implement the narrow restore primitive**

- keep `toggleSource`, `removeSource`, and `resetSelection` semantics intact
- do not change service calls or persistence contracts

**Step 4: Run focused tests to verify they pass**

```bash
cd web && npx vitest run src/hooks/usePipelineSourceSet.test.ts
```

Expected after implementation:

- ordered replacement and restore tests pass

**Commit:** `test(index-builder): support ordered source-set restoration`

### Task 3: Replace Ad-Hoc Dirty And Discard Logic With Saved Snapshot Orchestration

**Files**

- Modify `web/src/hooks/useIndexBuilderJob.ts`
- Modify `web/src/hooks/useIndexBuilderJob.test.ts`

**Intent**

Eliminate manual dirty toggles and restore behavior that only partially reflects saved state.

**Step 1: Model the saved snapshot explicitly**

Track:

- saved label
- saved ordered selected source UID list
- saved source-set ID

Capture the snapshot after:

- loading an existing source set successfully
- saving a new draft successfully
- saving an existing source set successfully

**Step 2: Derive dirtiness from snapshot versus current state**

`hasUnsavedChanges` must compare:

- current `jobName`
- current ordered `pipelineSourceSet.selectedSourceUids`
- saved snapshot

Do not keep file-membership dirtiness dependent on ad-hoc boolean writes.

**Step 3: Update discard behavior**

For existing jobs:

- restore saved title
- restore saved ordered membership
- clear dirty state by returning to the saved snapshot

For new jobs:

- keep the page-level behavior of returning to list

**Step 4: Keep save-before-run behavior correct**

If label or membership differs from the saved snapshot:

- persist first
- refresh the saved snapshot
- then trigger the job

If nothing changed:

- trigger without unnecessary re-save

**Step 5: Run focused tests to verify they pass**

```bash
cd web && npx vitest run src/hooks/useIndexBuilderJob.test.ts
```

Expected after implementation:

- dirty-state tests pass
- discard restore tests pass
- save-before-run tests pass

**Commit:** `fix(index-builder): persist and restore file membership edits`

### Task 4: Back The One-Page Workbench With Search Params

**Files**

- Modify `web/src/pages/IndexBuilderPage.tsx`
- Modify `web/src/pages/IndexBuilderPage.test.tsx`
- Modify `web/src/hooks/useIndexBuilderList.ts`

**Intent**

Preserve the one-page architecture while making selection resilient across reload, direct entry, and back/forward navigation.

**Step 1: Replace local-only selected-job state with search params**

Use same-route search params only:

- `?job=<sourceSetId>` for existing detail
- `?job=new` for draft creation
- missing or blank `job` param for list view

Page actions:

- `selectJob(jobId)` sets `job=<jobId>`
- `createNewJob()` sets `job=new`
- `backToList()` clears `job`
- `onJobSaved(savedId)` replaces `job=new` with `job=<savedId>`

**Step 2: Define invalid-param handling explicitly**

Behavior must be:

- missing or blank `job` => list view
- `new` => draft view
- any other non-empty string => attempt detail load
- failed detail load => existing detail error state plus return-to-list action

Do not auto-create a draft for invalid values.
Do not introduce new routes.

**Step 3: Remove stale split-route semantics from `useIndexBuilderList`**

- remove route-navigation helpers that imply `/new` and `/:jobId` pages
- keep list refresh/data responsibilities only

**Step 4: Run focused tests to verify they pass**

```bash
cd web && npx vitest run src/pages/IndexBuilderPage.test.tsx
```

Expected after implementation:

- valid deep links reopen detail
- `?job=new` reopens draft
- blank param shows list
- stale/inaccessible param fails safely
- back-to-list clears the param

**Commit:** `fix(index-builder): back workbench selection with search params`

### Task 5: Full Verification And Operational Debug Loop

**Files**

- No planned file edits

**Intent**

Prove the remediation is correct without expanding scope into unrelated hardening work.

**Step 1: Frontend verification**

```bash
cd web && npx vitest run src/hooks/useIndexBuilderJob.test.ts src/hooks/usePipelineSourceSet.test.ts src/pages/IndexBuilderPage.test.tsx src/hooks/usePipelineJob.test.ts src/lib/pipelineService.test.ts src/lib/indexJobStatus.test.ts
cd web && npx tsc -b --noEmit
```

Expected output:

- all listed Vitest modules pass
- build-mode TypeScript exits with no diagnostics

If `cd web && npx tsc -b --noEmit` fails only in files outside the locked file inventory for this plan, stop and ask for a scope decision instead of silently fixing unrelated frontend work.

**Step 2: Backend verification**

```bash
cd services/platform-api && pytest -q tests/test_pipelines_routes.py tests/test_pipeline_source_sets_routes.py tests/test_pipeline_worker.py tests/test_markdown_index_builder_pipeline.py tests/test_pipeline_multi_markdown_job.py tests/test_pipeline_registry.py
```

Expected output:

- pipeline backend tests pass unchanged

**Step 3: Local runtime verification**

```bash
cd web && npm run dev
cd services/platform-api && uvicorn app.main:app --reload
```

Expected runtime behavior:

- Vite serves the web app on the repo-standard dev port
- `platform-api` starts normally
- the pipeline worker starts with app lifespan because `app/main.py` calls `start_pipeline_jobs_worker()`

**Step 4: Manual workbench verification**

1. Open `/app/pipeline-services/index-builder`.
2. Confirm list view renders.
3. Open an existing job and verify the URL includes `?job=<id>`.
4. Toggle one file off and verify the workbench becomes dirty immediately.
5. Click Discard and verify the original saved file selection returns.
6. Toggle a file again and click Start run.
7. Verify the job is saved before run creation and the latest file selection is what executes.
8. Copy the URL with `?job=<id>`, reload, and verify the same detail view reopens.
9. Open `/app/pipeline-services/index-builder?job=` and verify it behaves as list view.
10. Open `/app/pipeline-services/index-builder?job=not-a-real-source-set` and verify the page shows a safe detail load error with a return path to list.
11. Open `/app/pipeline-services/index-builder?job=new`, upload a markdown file, select it, save, and run.
12. Verify progress advances and artifact downloads activate only after completion.

**Step 5: If live verification fails, debug in this order**

1. Browser network:
   - `POST /storage/uploads`
   - signed `PUT` to `signed_upload_url`
   - `POST /storage/uploads/{reservation_id}/complete`
   - `POST /pipelines/{pipeline_kind}/source-sets`
   - `PATCH /pipelines/{pipeline_kind}/source-sets/{source_set_id}`
   - `POST /pipelines/{pipeline_kind}/jobs`
   - `GET /pipelines/{pipeline_kind}/jobs/latest`
   - `GET /pipelines/jobs/{job_id}`
   - `GET /pipelines/jobs/{job_id}/deliverables/{kind}/download`
2. `platform-api` logs:
   - upload reservation failures
   - source-set validation failures
   - pipeline job creation failures
   - worker stage and failure output
3. Database tables:
   - `pipeline_source_sets`
   - `pipeline_source_set_items`
   - `pipeline_jobs`
   - `pipeline_deliverables`
4. Deliverable storage:
   - confirm `pipeline_deliverables` rows exist
   - confirm stored object keys are downloadable by the backend

**Commit:** No commit. Verification only.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked acceptance contract passes end-to-end.
2. The locked file inventory matches the actual set of created, modified, preserved, and deleted files.
3. The locked inventory counts match reality.
4. The workbench remains a single-page implementation on the existing route path.
5. No new backend endpoints, migrations, or edge-function changes were introduced.
6. New `useIndexBuilderJob` tests pass.
7. New `usePipelineSourceSet` tests pass.
8. Existing `IndexBuilderPage`, `usePipelineJob`, `pipelineService`, and `indexJobStatus` frontend tests pass.
9. Existing pipeline backend tests pass.
10. `cd web && npx tsc -b --noEmit` exits with no errors.
11. One live create/upload/save/run/poll/download flow succeeds against local runtime dependencies.
