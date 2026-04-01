# Index Builder Route Workbench Activation Implementation Plan

**Goal:** Make `/app/pipeline-services/index-builder` operational by replacing the mounted mockup page with the already-wired Index Builder workbench, retiring the conflicting mock-only page components, and restoring the routed page test contract.

**Architecture:** Keep the existing `platform-api` pipeline and storage-upload contracts unchanged. Treat `web/src/pages/useIndexBuilderWorkbench.tsx` as the single frontend orchestration surface for the routed page, and rewrite `IndexBuilderPage.tsx` into the standard thin `Workbench` wrapper used by other document-workbench routes. Retire the isolated master-detail mockup components instead of partially wiring them, and stabilize the page test locally so it exercises the real workbench route without `ResizeObserver` test-environment noise.

**Tech Stack:** React, TypeScript, Vite, Workbench UI, existing FastAPI platform routes, Vitest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-31

## Manifest

### Platform API

No new platform API endpoints and no contract changes in this slice. The routed page will reuse the existing upload, source-set, job, and deliverable endpoints as-is.

| Verb | Path | Action | Status |
|------|------|--------|--------|
| POST | `/storage/uploads` | Reserve a signed upload for pipeline source ingestion | Existing - reused as-is |
| POST | `/storage/uploads/{reservation_id}/complete` | Complete a reserved source upload | Existing - reused as-is |
| GET | `/pipelines/{pipeline_kind}/sources` | Read owned sources available for source-set selection | Existing - reused as-is |
| GET | `/pipelines/{pipeline_kind}/source-sets` | List source sets for the selected project, including `latest_job` summaries | Existing - reused as-is |
| GET | `/pipelines/{pipeline_kind}/source-sets/{source_set_id}` | Read the active source-set detail | Existing - reused as-is |
| POST | `/pipelines/{pipeline_kind}/source-sets` | Persist a new ordered source set | Existing - reused as-is |
| PATCH | `/pipelines/{pipeline_kind}/source-sets/{source_set_id}` | Update the active source set before reruns | Existing - reused as-is |
| POST | `/pipelines/{pipeline_kind}/jobs` | Queue a processing run for a source set | Existing - reused as-is |
| GET | `/pipelines/{pipeline_kind}/jobs/latest` | Hydrate the latest job for the active source set | Existing - reused as-is |
| GET | `/pipelines/jobs/{job_id}` | Poll the in-flight job until terminal state and read embedded deliverables | Existing - reused as-is |
| GET | `/pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download` | Download a completed deliverable | Existing - reused as-is |

There are no request or response contract changes. In particular:

- No new list-jobs endpoint is added.
- No backend `draft` job status is introduced.
- No pipeline route is modified to support the retired mockup data model.

### Observability

No new traces, metrics, or structured logs in this slice.

Justification:

- This implementation mounts an already-existing frontend flow onto the already-existing routed page.
- It creates no new backend-owned runtime seam, no new Vite helper seam, and no new database dependency chain.
- The existing worker, pipeline-route, and storage-upload telemetry remain the runtime observability surface for the real flow.

### Database Migrations

No database migrations.

Justification:

- `pipeline_source_sets`, `pipeline_source_set_items`, and `pipeline_jobs.source_set_id` already exist and are already the live system of record.
- This work does not alter job state, draft modeling, deliverable storage, or uniqueness rules.

### Edge Functions

No edge functions created or modified.

The routed-page correction stays in the existing React and `platform-api` surfaces. No Supabase edge-function reuse is introduced.

### Frontend Surface Area

**New pages:** `0`

**New components:** `0`

**New hooks:** `0`

**New libraries/services:** `0`

**Modified pages:** `1`

| Page | File | What changes |
|------|------|--------------|
| `IndexBuilderPage` | `web/src/pages/IndexBuilderPage.tsx` | Replace the mock master-detail page with the standard `Workbench` wrapper around `useIndexBuilderWorkbench()` |

**Modified test modules:** `1`

| Test | File | What changes |
|------|------|--------------|
| `IndexBuilderPage` route tests | `web/src/pages/IndexBuilderPage.test.tsx` | Add local `ResizeObserver` stabilization and keep the real workbench-route behavior as the page contract |

**Deleted components:** `3`

| Component | File | Why it is deleted |
|-----------|------|-------------------|
| `PipelineRunsTable` | `web/src/components/pipelines/PipelineRunsTable.tsx` | Mock-only runs browser table; no longer mounted or planned in this slice |
| `PipelineRunDetailPanel` | `web/src/components/pipelines/PipelineRunDetailPanel.tsx` | Mock-only detail view with unwired upload/download seams |
| `PipelineNewRunForm` | `web/src/components/pipelines/PipelineNewRunForm.tsx` | Mock-only draft form tied to the retired page model |

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The mounted route at `/app/pipeline-services/index-builder` switches to the standard workbench wrapper pattern used elsewhere in `web/src/pages/`, not the mock master-detail layout in the current page file.
2. `web/src/pages/useIndexBuilderWorkbench.tsx` is the only orchestration surface for uploads, source-set persistence, job triggering, job polling, and deliverable download in this slice.
3. Browser-visible run state remains `source set + latest job` from the existing source-set and job endpoints. This plan does not add a dedicated jobs-list endpoint or a backend `draft` state.
4. The three mockup-only pipeline page components are retired and deleted once the route no longer imports them. They are not kept behind conditionals, feature flags, or alternate branches in `IndexBuilderPage.tsx`.
5. The existing storage-upload and pipeline route contracts remain unchanged. This plan does not include the unrelated backend cleanups around quoted download filenames or multi-source `source_uid` semantics.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. Navigating to `/app/pipeline-services/index-builder` renders a workbench page with `Index Builder` and `Runs & Downloads` tabs.
2. The route no longer renders the mock runs table, mock detail panel, or mock “new run” form, and no `console.log` page stubs remain.
3. Uploading markdown files from the main tab calls the existing upload flow and refreshes source files without auto-starting a job.
4. Saving a source set and starting processing queues the existing backend job and moves the operator into the `Runs & Downloads` workbench tab.
5. Existing route-local persistence keyed to `pipeline-services-index-builder-v2` still works, and stale localStorage keyed to the older shared pipeline tabs is ignored.
6. The targeted Vitest suite for the Index Builder route and its existing pipeline panels passes with no unhandled `ResizeObserver` errors.

### Locked Platform API Surface

#### New platform API endpoints: `0`

#### Modified existing platform API endpoints: `0`

#### Existing platform API endpoints reused as-is: `11`

1. `POST /storage/uploads`
2. `POST /storage/uploads/{reservation_id}/complete`
3. `GET /pipelines/{pipeline_kind}/sources`
4. `GET /pipelines/{pipeline_kind}/source-sets`
5. `GET /pipelines/{pipeline_kind}/source-sets/{source_set_id}`
6. `POST /pipelines/{pipeline_kind}/source-sets`
7. `PATCH /pipelines/{pipeline_kind}/source-sets/{source_set_id}`
8. `POST /pipelines/{pipeline_kind}/jobs`
9. `GET /pipelines/{pipeline_kind}/jobs/latest`
10. `GET /pipelines/jobs/{job_id}`
11. `GET /pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download`

### Locked Observability Surface

#### New traces: `0`

#### New metrics: `0`

#### New structured logs: `0`

Locked zero-case justification:

- The implementation adds no new owned runtime seam.
- The live backend flow is already traced through the existing pipeline and storage route surfaces.
- The only new work is frontend route mounting and test stabilization.

### Locked Inventory Counts

#### Database

- New migrations: `0`
- Modified existing migrations: `0`

#### Backend

- New route modules: `0`
- Modified existing backend modules: `0`

#### Frontend

- New top-level pages/routes: `0`
- Modified existing pages: `1`
- New visual components: `0`
- Deleted existing components: `3`
- Modified existing hooks: `0`
- Modified existing libraries/services: `0`

#### Tests

- New test modules: `0`
- Modified existing test modules: `1`

### Locked File Inventory

#### New files

None.

#### Modified files

- `web/src/pages/IndexBuilderPage.tsx`
- `web/src/pages/IndexBuilderPage.test.tsx`

#### Deleted files

- `web/src/components/pipelines/PipelineRunsTable.tsx`
- `web/src/components/pipelines/PipelineRunDetailPanel.tsx`
- `web/src/components/pipelines/PipelineNewRunForm.tsx`

## Frozen Index Builder Route Contract

The current defect exists because the routed page owns a second, fake orchestration layer. This implementation must remove that split-brain state instead of trying to partially wire the mock page.

Do not implement this by:

- adding a new list-jobs backend endpoint
- inventing a backend `draft` job status
- teaching `IndexBuilderPage.tsx` a second upload/source-set/job state machine beside `useIndexBuilderWorkbench.tsx`
- keeping the mock components mounted anywhere inside the routed page

The route must become a thin wrapper over the existing workbench hook and the standard `Workbench` shell, matching the established page pattern used by `ParsePage.tsx`, `ConvertPage.tsx`, and related workbench routes.

## Explicit Risks Accepted In This Plan

1. This slice favors operational correctness over the richer master-detail runs browser. If multi-run browsing remains desirable, it must return in a later plan built explicitly around the existing `source set + latest_job` model.
2. The workbench remains source-set-centric rather than jobs-list-centric in this slice. Operators can run and monitor the selected source set, but this plan does not add historical multi-source browsing.
3. The unrelated backend review findings around quoted `Content-Disposition` filenames and multi-source `source_uid` semantics remain deferred because they do not block activation of the real routed workbench.

## Completion Criteria

The work is complete only when all of the following are true:

1. `IndexBuilderPage.tsx` is a standard workbench page wrapper around `useIndexBuilderWorkbench()`.
2. No mock data arrays, mock page stubs, or mockup-only components remain in the live route.
3. The three retired mockup components are deleted and no longer referenced anywhere in `web/src/`.
4. The platform API, observability, and database surfaces remain exactly as locked above: zero endpoint changes, zero new telemetry, zero migrations.
5. The locked inventory counts match the actual modified and deleted file set.
6. The targeted frontend verification commands in this plan pass.

## Tasks

## Task 1: Lock The Routed Page Test Contract Around The Real Workbench

**File(s):** `web/src/pages/IndexBuilderPage.test.tsx`

**Step 1:** Add a local `ResizeObserver` stub in `IndexBuilderPage.test.tsx` so the page test exercises the routed workbench behavior without unhandled browser-API noise.
**Step 2:** Keep the existing assertions that the route renders `Runs & Downloads`, omits `Service Overview`, uploads without auto-starting, persists the source set before triggering processing, and ignores legacy shared workbench state.
**Step 3:** Run the focused Vitest file and confirm it still fails against the current mock `IndexBuilderPage.tsx` for behavioral reasons rather than missing browser APIs.

**Test command:** `cd web && npm run test -- src/pages/IndexBuilderPage.test.tsx`
**Expected output:** The file runs without unhandled `ResizeObserver` errors, and the remaining failures point at the routed page still rendering the mock implementation.

**Commit:** `test: stabilize index builder page workbench contract`

## Task 2: Replace The Routed Mock Page With The Existing Workbench Wrapper

**File(s):** `web/src/pages/IndexBuilderPage.tsx`

**Step 1:** Rewrite `IndexBuilderPage.tsx` to match the standard workbench page pattern used by `ParsePage.tsx`: import `Workbench`, call `useIndexBuilderWorkbench()`, and pass through `workbenchRef`, `INDEX_BUILDER_TABS`, `defaultPanes`, `saveKey`, and `renderContent`.
**Step 2:** Remove the mock runs array, mock panel layout, `console.log` page stubs, and any route-local state that duplicates `useIndexBuilderWorkbench()`.
**Step 3:** Re-run `src/pages/IndexBuilderPage.test.tsx` until the routed page renders the real workbench flow and the file passes.

**Test command:** `cd web && npm run test -- src/pages/IndexBuilderPage.test.tsx`
**Expected output:** Vitest reports `src/pages/IndexBuilderPage.test.tsx` passes with `0 failed`.

**Commit:** `fix: mount the real index builder workbench`

## Task 3: Retire The Mockup-Only Page Components

**File(s):** `web/src/components/pipelines/PipelineRunsTable.tsx`, `web/src/components/pipelines/PipelineRunDetailPanel.tsx`, `web/src/components/pipelines/PipelineNewRunForm.tsx`

**Step 1:** Delete the three mockup-only components that were only imported by the retired `IndexBuilderPage` implementation.
**Step 2:** Search `web/src/` for `PipelineRunsTable`, `PipelineRunDetailPanel`, and `PipelineNewRunForm` and confirm no live references remain.
**Step 3:** Re-run the routed page test to verify the deletions did not disturb the live workbench route.

**Test command:** `cd web && npm run test -- src/pages/IndexBuilderPage.test.tsx`
**Expected output:** The page test still passes with `0 failed`, and `rg` finds no remaining live imports of the retired mockup components.

**Commit:** `refactor: retire unused index builder mock components`

## Task 4: Run The Focused Pipeline Frontend Regression Suite

**File(s):** `web/src/pages/IndexBuilderPage.test.tsx`, `web/src/hooks/usePipelineJob.test.ts`, `web/src/components/pipelines/PipelineUploadPanel.test.tsx`, `web/src/components/pipelines/PipelineSourceFilesPanel.test.tsx`, `web/src/components/pipelines/PipelineSourceSetPanel.test.tsx`, `web/src/components/pipelines/PipelineJobStatusPanel.test.tsx`, `web/src/components/pipelines/PipelineDeliverablesPanel.test.tsx`

**Step 1:** Run the focused Vitest regression suite for the routed Index Builder page and the existing pipeline workbench panels.
**Step 2:** If any failure appears outside `IndexBuilderPage.test.tsx`, fix only regressions caused by the route swap or the deleted mockup files; do not expand scope into new product behavior.
**Step 3:** Re-run the same suite until it passes cleanly.

**Test command:** `cd web && npm run test -- src/pages/IndexBuilderPage.test.tsx src/hooks/usePipelineJob.test.ts src/components/pipelines/PipelineUploadPanel.test.tsx src/components/pipelines/PipelineSourceFilesPanel.test.tsx src/components/pipelines/PipelineSourceSetPanel.test.tsx src/components/pipelines/PipelineJobStatusPanel.test.tsx src/components/pipelines/PipelineDeliverablesPanel.test.tsx`
**Expected output:** Vitest reports the selected pipeline and Index Builder modules pass with `0 failed`.

**Commit:** `test: verify routed index builder workbench regression suite`

## Task 5: Prove The Page Still Builds In The Normal Web App Pipeline

**File(s):** `web/src/pages/IndexBuilderPage.tsx`, `web/src/pages/useIndexBuilderWorkbench.tsx`

**Step 1:** Run the normal web build after the route swap and mockup-component deletion.
**Step 2:** Confirm the build completes without unresolved imports, dead-component references, or TypeScript errors caused by the route rewrite.
**Step 3:** If the build surfaces unrelated pre-existing failures, stop and distinguish them from this slice before making further changes.

**Test command:** `cd web && npm run build`
**Expected output:** The web build completes successfully with the updated Index Builder route and no import errors from the retired mockup files.

**Commit:** `chore: validate index builder route build`
