# Index Builder Single-Route Registry Workbench Implementation Plan

**Goal:** Correct the Index Builder frontend so the saved-job registry, selected-job detail, file membership model, and run CTA behavior match the design brief and the verified live-user failures. A saved draft must create a visible draft row, a new draft must not appear pre-linked to another job's files, and reload/share behavior must remain stable through same-route search params.

**Architecture:** Keep a single route at `/app/pipeline-services/index-builder` and use same-route search params for selection (`?job=new` or `?job=<source_set_id>`). The page always renders the saved jobs registry table and the selected-job detail workbench on the same route. `pipeline_source_sets` remains the system of record for saved jobs. The project file library still comes from the existing upload and source-list APIs, but the detail surface must present one job-scoped membership table whose checked state comes only from the current draft or saved source set. Existing backend APIs, storage upload flows, and persistence tables remain unchanged.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing FastAPI `pipelines.py` routes, existing storage upload APIs, Vitest, `tsc -b`, and live Playwright verification through the existing Codex/browser workflow.

**Status:** Draft
**Author:** Codex
**Date:** 2026-04-02
**Supersedes:** `docs/plans/2026-04-01-index-builder-one-page-operational-hardening-plan.md`
**Primary design inputs:** `docs/plans/index-builder-design-brief.md`, `docs/plans/index-builder-redesign-dev-notes.md`

## Manifest

### Platform API

#### New endpoint contracts

None. This plan does not add backend endpoints.

#### Modified endpoint contracts

None. This plan reuses the current response shapes as-is.

#### Reused platform API and upload seams

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

#### Zero-case verification

Verified against the current frontend service layer and `services/platform-api/app/api/routes/pipelines.py`: the existing backend already exposes the saved source-set, latest-job, deliverable, and upload seams needed for this correction. The current failures are in frontend state modeling and page composition, not missing backend routes.

### Observability

#### New traces

None.

#### New metrics

None.

#### Reused observability surface

Reuse the existing backend spans already emitted by the pipeline routes for source listing, source-set CRUD, job creation, latest-job reads, job detail reads, and deliverable download flows.

#### Zero-case verification

No new owned runtime seam is being added. This plan reorchestrates existing frontend calls over already traced backend endpoints, so new application telemetry is not required.

### Database Migrations

None.

#### Zero-case verification

Verified against the current frontend and backend contracts: this plan does not require new tables, new columns, or membership persistence changes beyond existing `pipeline_source_sets.source_uids`.

### Edge Functions

None.

#### Zero-case verification

Index Builder run creation and deliverable access continue to flow through the current platform API and worker path. This plan does not add or modify edge functions.

### Frontend Surface Area

#### Modified files

- `web/src/pages/IndexBuilderPage.tsx`
- `web/src/pages/IndexBuilderPage.test.tsx`
- `web/src/hooks/useIndexBuilderJob.ts`
- `web/src/hooks/useIndexBuilderJob.test.ts`
- `web/src/hooks/usePipelineSourceSet.ts`
- `web/src/hooks/usePipelineSourceSet.test.ts`
- `web/src/components/pipelines/IndexJobFilesTab.tsx`
- `web/src/components/pipelines/IndexJobArtifactsTab.tsx`

#### New files

- `web/src/components/pipelines/IndexJobFilesTab.test.tsx`

#### Preserved files

- `web/src/hooks/useIndexBuilderList.ts`
- `web/src/components/pipelines/IndexJobsList.tsx`
- `web/src/components/pipelines/IndexJobRunsTab.tsx`
- `web/src/components/pipelines/IndexJobConfigTab.tsx`
- `web/src/hooks/usePipelineJob.ts`
- `web/src/lib/pipelineService.ts`
- `web/src/lib/pipelineSourceSetService.ts`
- `web/src/lib/storageUploadService.ts`
- `services/platform-api/app/api/routes/pipelines.py`

## Pre-Implementation Contract

1. A saved Index Job is one `pipeline_source_sets` row.
2. An unsaved draft is frontend state only until the user clicks `Save draft`.
3. The jobs registry shows saved jobs only. It must not synthesize a fake row for an unsaved draft.
4. The project file library is the set returned by `GET /pipelines/{pipeline_kind}/sources` for the current project.
5. The selected job membership is the ordered `source_uids` list for the active draft or saved source set.
6. Library visibility and job membership are separate concerns. A file can exist in the library without being checked for the current job.
7. The checked state in the files table must come only from the current draft or the selected saved job, never from another saved job's membership.
8. `?job=new` means "open an unsaved draft in the detail surface." `?job=<source_set_id>` means "load that saved source set into the detail surface."
9. The jobs registry remains visible with no selection, with `?job=new`, with a valid saved job, and with an invalid `?job`.
10. Run creation remains save-gated: a run can only be started from a saved, currently valid job definition.

### Locked Product Decisions

1. Keep a single mounted route: `/app/pipeline-services/index-builder`.
2. Keep same-route search params as the only selection mechanism. No second list/detail route is introduced in this plan.
3. The page always renders the saved jobs registry table. Selecting a job must not hide the registry.
4. The selected job detail remains one continuous surface on the same page. No detail tabs are introduced.
5. The files surface becomes a real table with checkboxes. The current card-list treatment is removed.
6. The files table represents the current job's membership over the broader project library. Unchecked rows are available files, not already-linked files.
7. Uploading files from inside the selected job detail adds them to the project library and immediately checks them into the current draft selection.
8. First save creates exactly one saved-row entry in the jobs registry, selects it, and replaces `?job=new` with `?job=<source_set_id>`.
9. The run CTA is always visible in the detail header, but its enabled state follows the locked CTA matrix below.
10. Download buttons for the lexical SQLite and semantic archive remain visible even before artifacts exist; they render disabled until the latest run completes successfully and the deliverables are available.
11. Configuration remains read-only in this plan. No chunking or embedding editor is added.

### Locked Acceptance Contract

1. Loading `/app/pipeline-services/index-builder` with no `job` param shows the saved jobs table and a neutral detail empty state that prompts the user to create or select a job.
2. Clicking `New Index Job` changes the URL to `?job=new`, keeps the jobs table visible, opens an unsaved detail state, and does not add a table row yet.
3. While `?job=new` is open, the files table shows project-library rows with unchecked boxes unless the user selected them in the current draft. Files uploaded previously for other jobs may appear as library rows, but they must not appear checked just because they exist.
4. Uploading a new markdown file from the current detail surface adds a new row to the files table and checks it for the current draft.
5. Clicking `Save draft` on a new draft creates exactly one source set, refreshes the jobs table, selects the new row, and updates the URL to `?job=<source_set_id>`.
6. Selecting a saved row loads only that job's label and ordered membership. Switching between saved rows changes the checked state accordingly.
7. Reloading or opening a new tab with `?job=<source_set_id>` reopens that same saved job and leaves the jobs table visible.
8. An invalid `?job=<unknown>` keeps the jobs table visible and renders a safe detail error plus a working `Return to list` action.
9. `Discard` on a saved job restores the saved label and ordered membership. `Discard` on `?job=new` exits back to the no-selection state and clears the unsaved draft.
10. CTA matrix:
   - New unsaved draft: `Save draft` enabled, `Start run` visible and disabled with helper text indicating the job must be saved first.
   - Saved but invalid job: `Start run` visible and disabled with an inline reason such as `Add at least one markdown file to run this job`.
   - Saved and valid clean job: `Start run` enabled.
   - Saved and valid dirty job: primary `Save and start`, secondary `Save changes`, plus `Discard`.
   - Saved and invalid dirty job: `Save changes` enabled, `Start run` disabled until valid again, plus `Discard`.
11. The artifacts section always renders the two download affordances, disabled until a successful run exposes the deliverables.

### Locked Platform API Surface

#### New platform API endpoints: `0`

None.

#### Existing platform API endpoints modified: `0`

None.

#### Existing platform API and upload endpoints reused as-is: `12`

1. `GET /pipelines/{pipeline_kind}/sources` for the project library table rows.
2. `GET /pipelines/{pipeline_kind}/source-sets` for the saved jobs registry.
3. `POST /pipelines/{pipeline_kind}/source-sets` for first-save draft creation.
4. `GET /pipelines/{pipeline_kind}/source-sets/{source_set_id}` for saved detail reload.
5. `PATCH /pipelines/{pipeline_kind}/source-sets/{source_set_id}` for saving membership or label edits.
6. `POST /pipelines/{pipeline_kind}/jobs` for run creation.
7. `GET /pipelines/{pipeline_kind}/jobs/latest` for the current/latest run surface.
8. `GET /pipelines/jobs/{job_id}` for direct job refresh after transitions.
9. `GET /pipelines/jobs/{job_id}/deliverables` for latest artifact availability.
10. `GET /pipelines/jobs/{job_id}/deliverables/{deliverable_kind}/download` for download actions.
11. `POST /storage/uploads` for upload reservation.
12. `POST /storage/uploads/{reservation_id}/complete` for upload completion.

#### Caller mapping

- `useIndexBuilderList` continues to own the jobs registry query.
- `usePipelineSourceSet` continues to own library refresh, source-set load, and source-set persistence.
- `useIndexBuilderJob` continues to orchestrate save, discard, CTA state, and run triggering.
- `IndexJobArtifactsTab` continues to own the visible download affordances.

### Locked Observability Surface

#### New traces: `0`

None.

#### New metrics: `0`

None.

#### Reused spans

- Pipeline source list span
- Pipeline source-set list span
- Pipeline source-set create span
- Pipeline source-set get span
- Pipeline source-set update span
- Pipeline job create span
- Pipeline latest-job read span
- Pipeline job detail read span
- Pipeline deliverables list span
- Pipeline deliverable download span

#### Observability attribute rules

- Allowed in any new non-production test diagnostics: `pipeline_kind`, `source_set_id`, `job_id`, `status`, `member_count`.
- Forbidden in any new runtime logging or diagnostics: `user_id`, signed upload URLs, signed download URLs, `source_locator`, file contents, raw markdown text.

### Locked Inventory Counts

#### Backend

- New runtime files: `0`
- Modified runtime files: `0`
- New tests: `0`
- Modified tests: `0`

#### Frontend

- New runtime files: `0`
- Modified runtime files: `5`
- New tests: `1`
- Modified tests: `3`

#### Tests

- Focused Vitest suites executed during implementation: `4`
- Manual Playwright workbench flows executed during verification: `6`

### Locked File Inventory

#### New files

- `web/src/components/pipelines/IndexJobFilesTab.test.tsx`

#### Modified files

- `web/src/pages/IndexBuilderPage.tsx`
- `web/src/pages/IndexBuilderPage.test.tsx`
- `web/src/hooks/useIndexBuilderJob.ts`
- `web/src/hooks/useIndexBuilderJob.test.ts`
- `web/src/hooks/usePipelineSourceSet.ts`
- `web/src/hooks/usePipelineSourceSet.test.ts`
- `web/src/components/pipelines/IndexJobFilesTab.tsx`
- `web/src/components/pipelines/IndexJobArtifactsTab.tsx`

#### Preserved files

- `web/src/hooks/useIndexBuilderList.ts`
- `web/src/components/pipelines/IndexJobsList.tsx`
- `web/src/components/pipelines/IndexJobRunsTab.tsx`
- `web/src/components/pipelines/IndexJobConfigTab.tsx`
- `web/src/hooks/usePipelineJob.ts`
- `web/src/lib/pipelineService.ts`
- `web/src/lib/pipelineSourceSetService.ts`
- `web/src/lib/storageUploadService.ts`
- `services/platform-api/app/api/routes/pipelines.py`

#### Deleted files

None.

## Frozen Project Library And Job Membership Contract

### What is frozen

- The project library is project-scoped and reused across jobs.
- A saved job row is source-set state only.
- The current detail surface is draft-or-source-set state only.
- Checked membership is derived exclusively from the active draft or selected source set.

### What must stay true

1. Entering `?job=new` never mutates backend state.
2. Entering `?job=new` never inherits checked membership from another saved job.
3. Saving a new draft is the first moment a registry row is created.
4. Switching saved jobs swaps checked membership to that job's saved `source_uids`.
5. Project-library rows can remain visible across jobs, but checked state must always be job-specific.

### What must not happen

- No synthetic saved row for an unsaved draft.
- No conditional hiding of the jobs table once detail is selected.
- No card-list files surface masquerading as a job membership table.
- No invisible run CTA on a draft state.
- No artifact area that disappears entirely before completion.

## Explicit Risks Accepted In This Plan

1. This plan does not add a historical runs table because the current backend exposes latest-run reads rather than a list-runs-by-source-set endpoint.
2. Project-library rows will still include files uploaded for other jobs in the same project. The correction is job-scoped checked state, not library partitioning.
3. Manual Playwright verification remains mandatory because the repository does not currently have a committed end-to-end harness for this workbench.
4. On smaller viewports the registry and detail surfaces will stack vertically, which may increase scroll depth even though both remain on the same route.

## Completion Criteria

1. A saved draft produces a visible selected row in the jobs table on the same page.
2. `?job=new` and `?job=<source_set_id>` are reload-safe and keep the jobs table visible.
3. New drafts no longer show another job's checked membership.
4. The files surface renders as a real table with checkboxes and upload-driven row insertion.
5. The CTA matrix matches the locked contract for unsaved, invalid, clean-valid, and dirty-valid states.
6. The artifacts area always shows disabled-or-enabled download affordances instead of disappearing.
7. `cd web && npx vitest run src/hooks/usePipelineSourceSet.test.ts src/hooks/useIndexBuilderJob.test.ts src/pages/IndexBuilderPage.test.tsx src/components/pipelines/IndexJobFilesTab.test.tsx`
   Expected: all targeted tests pass.
8. `cd web && npx tsc -b --noEmit`
   Expected: success with no TypeScript build errors.
9. Live Playwright verification against a local dev server confirms the six locked flows listed in Task 4 and stores screenshots under `output/playwright/`.

## Tasks

## Task 1: Keep The Registry Visible While Reworking Same-Route Detail Selection

**Files**

- `web/src/pages/IndexBuilderPage.tsx`
- `web/src/pages/IndexBuilderPage.test.tsx`

**Intent**

Stop the page from acting like list view and detail view are mutually exclusive states. The jobs table must remain on the page at all times, while the detail surface responds to `?job`.

**Steps**

1. Change the page layout so `IndexJobsList` always renders.
2. Add a neutral no-selection detail state for the base route with no `job` param.
3. Keep `?job=new` and `?job=<source_set_id>` as the only detail selectors.
4. Preserve the invalid-`?job` error state, but keep the jobs table visible and wire `Return to list` back to the no-selection state.
5. Refresh the jobs list after first-save draft creation so the newly persisted source set is immediately visible as a selected row.
6. Extend the page test to lock:
   - jobs table visible with and without selection
   - first-save row creation
   - reload-safe selected row behavior
   - invalid-`?job` return-to-list behavior

**Test command**

```bash
cd web && npx vitest run src/pages/IndexBuilderPage.test.tsx
```

**Expected output**

`IndexBuilderPage.test.tsx` passes with coverage for base, new-draft, saved-row, reload, and invalid-selection states.

**Commit**

`test: lock index builder same-route registry visibility`

## Task 2: Separate Project Library State From Active Job Membership

**Files**

- `web/src/hooks/usePipelineSourceSet.ts`
- `web/src/hooks/usePipelineSourceSet.test.ts`
- `web/src/hooks/useIndexBuilderJob.ts`
- `web/src/hooks/useIndexBuilderJob.test.ts`

**Intent**

Make the active draft or saved job the only source of checked membership, while keeping the broader project library available for display and selection.

**Steps**

1. Treat the fetched project library and the active selected membership as separate state domains.
2. Ensure `?job=new` clears checked membership without clearing the fetched project library.
3. Ensure loading a saved source set replaces checked membership with that source set's ordered `source_uids`.
4. Ensure discarding a saved job restores the saved ordered membership snapshot.
5. Ensure newly uploaded files can be added to the current draft selection without contaminating other saved jobs.
6. Extend hook tests to lock:
   - new draft starts with empty checked membership even when the project library is non-empty
   - switching saved jobs swaps checked membership correctly
   - discard restores saved ordered membership
   - dirty-valid jobs expose the correct CTA state inputs

**Test command**

```bash
cd web && npx vitest run src/hooks/usePipelineSourceSet.test.ts src/hooks/useIndexBuilderJob.test.ts
```

**Expected output**

Both hook suites pass and explicitly prove that project-library presence does not equal job membership.

**Commit**

`fix: separate index builder library state from job membership`

## Task 3: Replace The Files Card List With A Real Membership Table

**Files**

- `web/src/components/pipelines/IndexJobFilesTab.tsx`
- `web/src/components/pipelines/IndexJobFilesTab.test.tsx`

**Intent**

Bring the files surface into line with the design brief: a real uploaded-files table with checkbox-driven inclusion for the current job.

**Steps**

1. Keep the upload drop zone, but render the file rows in an actual HTML table.
2. Use columns for filename, size, and inclusion state.
3. Use the checkbox column as the membership control for the current active job only.
4. Distinguish unchecked available project files from checked current-job files through row copy and styling, not by splitting the UI into separate sections.
5. After an upload from the current detail surface, insert the new row and mark it checked in the current draft.
6. Add a component test that locks:
   - table rendering
   - checked versus unchecked row state
   - toggle behavior
   - upload result insertion semantics

**Test command**

```bash
cd web && npx vitest run src/components/pipelines/IndexJobFilesTab.test.tsx
```

**Expected output**

The component suite passes and the rendered DOM contains a real files table with checkbox-driven membership.

**Commit**

`feat: convert index builder files surface to membership table`

## Task 4: Lock CTA And Artifact Behavior With Live Browser Verification

**Files**

- `web/src/pages/IndexBuilderPage.tsx`
- `web/src/components/pipelines/IndexJobArtifactsTab.tsx`

**Intent**

Make the header actions and artifact affordances predictable, then verify the page by actually clicking through the flows that have repeatedly drifted.

**Steps**

1. Implement the locked CTA matrix for unsaved, invalid, clean-valid, dirty-valid, and dirty-invalid states.
2. Keep the run control visible on drafts, but disabled until save/validation conditions are met.
3. Keep lexical SQLite and semantic archive download affordances visible before completion, rendered disabled until the latest run exposes those deliverables.
4. Start the local app:
   ```bash
   cd web && npm run dev:alt
   ```
5. Run live Playwright verification against the local route and capture screenshots in `output/playwright/` for:
   - base route with visible registry and no selection
   - `?job=new`
   - first-save row creation
   - saved job switch with changed checked rows
   - reload on `?job=<source_set_id>`
   - invalid `?job` with `Return to list`
6. Treat any contradiction between the locked contract and live behavior as a stop-and-fix issue before completion.

**Verification commands**

```bash
cd web && npx tsc -b --noEmit
```

**Expected output**

The TypeScript build passes and the manual Playwright pass confirms the six browser flows without hiding the registry or leaking checked membership across jobs.

**Commit**

`fix: lock index builder workbench ctas and artifact affordances`

## Execution Handoff

1. Implement the tasks in order because each task locks a higher-level contract the following task depends on.
2. Do not broaden scope into backend, migrations, or run-history endpoints during implementation.
3. If implementation reveals a backend contract gap that contradicts the verified zero-cases above, stop and update this plan before coding past the contradiction.
