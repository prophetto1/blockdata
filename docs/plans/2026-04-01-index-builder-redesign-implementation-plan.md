# Index Builder Redesign Implementation Plan

**Goal:** Replace the current mock/workbench Index Builder page with a two-pane list+detail layout that separates Index Jobs from Runs from Artifacts, implements state-gated CTAs, and wires the page to real backend data.

**Architecture:** Index Job is a frontend adapter over `pipeline_source_sets`. Run is `pipeline_jobs`. Artifact is `pipeline_deliverables`. No new backend entities. Job status is composite: intrinsic states (`draft`, `ready`, `invalid`) are frontend-derived from source set state + validation; run-derived states (`running`, `failed`, `complete`) come from the latest `pipeline_jobs` record. The two-pane layout has a right-side Index Jobs list and a left-side selected-job detail panel with four tabs (Files, Config, Runs, Artifacts). All design decisions are locked in `docs/plans/index-builder-redesign-dev-notes.md`.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, existing FastAPI platform-api routes, existing Supabase tables.

**Status:** Draft
**Author:** Claude (requested by Jon)
**Date:** 2026-04-01

---

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

---

## Manifest

### Platform API

Two minor non-breaking response additions to existing endpoints. No new endpoints.

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/{pipeline_kind}/source-sets` | List source sets for project | Existing — add `created_at` to response items |
| GET | `/{pipeline_kind}/source-sets/{source_set_id}` | Read source set detail | Existing — add `created_at` to response |
| GET | `/{pipeline_kind}/jobs/latest` | Latest job for source set | Existing — reused as-is |
| POST | `/{pipeline_kind}/jobs` | Create/queue a job | Existing — reused as-is |
| GET | `/jobs/{job_id}` | Poll job with deliverables | Existing — reused as-is |
| GET | `/jobs/{job_id}/deliverables/{kind}/download` | Download artifact | Existing — reused as-is |
| GET | `/{pipeline_kind}/sources` | List uploaded sources | Existing — reused as-is |
| POST | `/{pipeline_kind}/source-sets` | Create source set | Existing — reused as-is |
| PATCH | `/{pipeline_kind}/source-sets/{source_set_id}` | Update source set | Existing — reused as-is |
| POST | `/storage/uploads` | Reserve upload | Existing — reused as-is |
| POST | `/storage/uploads/{reservation_id}/complete` | Complete upload | Existing — reused as-is |

#### Modified endpoint contracts

`GET /{pipeline_kind}/source-sets` (list)

- Change: add `created_at` to each item in the response.
- Why: the redesigned list needs to show "Created" and "Updated" as separate timestamps. The `updated_at` field already exists; `created_at` does not appear in the list response but exists in the database table.

`GET /{pipeline_kind}/source-sets/{source_set_id}` (detail)

- Change: add `created_at` to the serialized response.
- Why: the detail header needs to display "Created" as an explicit metadata label.

`_load_latest_job_summary` (internal helper, not an endpoint)

- Change: add `started_at` to the returned dictionary.
- Why: the list and detail header need "Last run" which uses the job's `started_at` timestamp. Currently the summary only returns `job_id`, `pipeline_kind`, `source_set_id`, `status`, `stage`.

### Observability

No new traces, metrics, or structured logs.

Justification: This is a frontend-only redesign. The backend API surface is unchanged except for adding fields to existing responses. All existing pipeline traces, metrics, and structured logs remain the observability surface.

### Database Migrations

No database migrations.

Justification: `pipeline_source_sets`, `pipeline_source_set_items`, `pipeline_jobs`, and `pipeline_deliverables` already exist with all required columns. The `created_at` column exists on `pipeline_source_sets` but was not previously included in the list response serialization.

### Edge Functions

No edge functions created or modified. This implementation stays in platform-api and the React frontend.

### Frontend Surface Area

**New pages:** `0`

**New components:** `7`

| Component | File | Used by |
|-----------|------|---------|
| `IndexJobsList` | `web/src/components/pipelines/IndexJobsList.tsx` | `IndexBuilderPage.tsx` |
| `IndexJobHeader` | `web/src/components/pipelines/IndexJobHeader.tsx` | `IndexBuilderPage.tsx` |
| `IndexJobFilesTab` | `web/src/components/pipelines/IndexJobFilesTab.tsx` | `IndexBuilderPage.tsx` |
| `IndexJobConfigTab` | `web/src/components/pipelines/IndexJobConfigTab.tsx` | `IndexBuilderPage.tsx` |
| `IndexJobRunsTab` | `web/src/components/pipelines/IndexJobRunsTab.tsx` | `IndexBuilderPage.tsx` |
| `IndexJobArtifactsTab` | `web/src/components/pipelines/IndexJobArtifactsTab.tsx` | `IndexBuilderPage.tsx` |
| `IndexJobStatusChip` | `web/src/components/pipelines/IndexJobStatusChip.tsx` | `IndexJobsList`, `IndexJobHeader` |

**New hooks:** `1`

| Hook | File | Purpose |
|------|------|---------|
| `useIndexBuilder` | `web/src/hooks/useIndexBuilder.ts` | Page-level state: job list, selection, status derivation, unsaved changes, save/run/retry actions |

**New libraries/services:** `1`

| Library | File | Purpose |
|---------|------|---------|
| `indexJobStatus` | `web/src/lib/indexJobStatus.ts` | `deriveIndexJobStatus()` pure function + `IndexJobStatus` type + `IndexJobViewModel` type |

**Modified pages:** `1`

| Page | File | What changes |
|------|------|--------------|
| `IndexBuilderPage` | `web/src/pages/IndexBuilderPage.tsx` | Complete rewrite: mock two-pane → real two-pane list+detail with 4 tabs, wired to `useIndexBuilder` |

**Modified test modules:** `1`

| Test | File | What changes |
|------|------|--------------|
| `IndexBuilderPage.test` | `web/src/pages/IndexBuilderPage.test.tsx` | Complete rewrite for new page structure: list rendering, selection, tab switching, CTA state gating, save/run flows |

**Modified hooks:** `1`

| Hook | File | What changes |
|------|------|--------------|
| `usePipelineSourceSet` | `web/src/hooks/usePipelineSourceSet.ts` | Expose `resetSelection()` and `loadSourceSet(sourceSetId)` methods for external state control by `useIndexBuilder` |

**Modified services (backend):** `1`

| File | What changes |
|------|--------------|
| `services/platform-api/app/services/pipeline_source_sets.py` | Add `created_at` to list and detail serialization; add `started_at` to `_load_latest_job_summary` |

**Modified types (frontend):** `2`

| File | What changes |
|------|--------------|
| `web/src/lib/pipelineSourceSetService.ts` | Add `created_at` to `PipelineSourceSet` type (flows through to `PipelineSourceSetSummary` via `Omit`) |
| `web/src/lib/pipelineService.ts` | Add `started_at` to `PipelineJobSummary` type |

---

## Locked Platform API Surface

### Existing platform API endpoints modified: `2`

1. `GET /{pipeline_kind}/source-sets` — add `created_at` to each list item
2. `GET /{pipeline_kind}/source-sets/{source_set_id}` — add `created_at` to detail response

### Internal helper modified: `1`

1. `_load_latest_job_summary` — add `started_at` to returned dictionary

### Existing platform API endpoints reused as-is: `9`

1. `GET /{pipeline_kind}/jobs/latest`
2. `POST /{pipeline_kind}/jobs`
3. `GET /jobs/{job_id}`
4. `GET /jobs/{job_id}/deliverables/{kind}/download`
5. `GET /{pipeline_kind}/sources`
6. `POST /{pipeline_kind}/source-sets`
7. `PATCH /{pipeline_kind}/source-sets/{source_set_id}`
8. `POST /storage/uploads`
9. `POST /storage/uploads/{reservation_id}/complete`

### New platform API endpoints: `0`

---

## Frozen Index Builder Seam Contract

This plan replaces the mounted page component (`IndexBuilderPage.tsx`) while leaving legacy files in the repository. The following constraints apply:

### Files that remain untouched

| File | Why it stays |
|------|-------------|
| `web/src/pages/useIndexBuilderWorkbench.tsx` | May be reused for a power-user workbench mode in a future iteration. Not imported by the redesigned page. |
| `web/src/components/pipelines/PipelineRunsTable.tsx` | Not imported by the redesigned page. May be used by other pipeline service pages or kept as reference. |
| `web/src/components/pipelines/PipelineNewRunForm.tsx` | Not imported by the redesigned page. |
| `web/src/components/pipelines/PipelineRunDetailPanel.tsx` | Not imported by the redesigned page. |
| `web/src/components/pipelines/PipelineUploadPanel.tsx` | Used by `useIndexBuilderWorkbench.tsx`. Remains intact. |
| `web/src/components/pipelines/PipelineSourceFilesPanel.tsx` | Used by `useIndexBuilderWorkbench.tsx`. Remains intact. |
| `web/src/components/pipelines/PipelineSourceSetPanel.tsx` | Used by `useIndexBuilderWorkbench.tsx`. Remains intact. |
| `web/src/components/pipelines/PipelineJobStatusPanel.tsx` | Used by `useIndexBuilderWorkbench.tsx`. Remains intact. |
| `web/src/components/pipelines/PipelineDeliverablesPanel.tsx` | Used by `useIndexBuilderWorkbench.tsx`. Remains intact. |

### Compatibility rules

1. No legacy file listed above may be modified by this plan.
2. The redesigned `IndexBuilderPage.tsx` must not import any of the legacy components or the workbench hook.
3. The existing hooks (`usePipelineJob`, `usePipelineSourceSet`) are shared infrastructure — the redesigned page composes them through the new `useIndexBuilder` hook. The legacy workbench also composes them. Both paths remain valid.
4. Deletion of legacy files is a separate cleanup concern and requires its own plan.

### What must NOT be implemented

- Do not merge the new `IndexJobRunsTab` stage tracker with `PipelineJobStatusPanel`. They are independent components with different parents.
- Do not import from legacy components "to avoid duplication." The new components own their own rendering.

---

## Locked Product Decisions

1. Index Job = frontend adapter over `pipeline_source_sets`. No new backend entity.
2. Job status is composite: intrinsic states are frontend-derived; run-derived states come from latest `pipeline_jobs`.
3. Draft persists on first explicit save, not on creation.
4. Files upload to `source_documents` independently before the draft is saved.
5. One active run per source set (backend-enforced unique constraint).
6. Artifacts belong to runs; the UI promotes latest-run artifacts to the job-level Artifacts tab.
7. Cancellation is out of scope for v1.
8. Inline logs are out of scope for v1. Progress + status only.
9. Config tab exists but shows read-only defaults (backend chunking params are hardcoded).
10. The page uses a standard two-pane layout (right = list, left = detail), not the workbench component.

## Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. The Index Builder page at `/app/pipeline-services/index-builder` renders a two-pane layout with the right side labeled "Index Jobs".
2. Each row in the right-side list represents a source set (Index Job), not a run. Columns: Name, Status, Last run, Updated.
3. Clicking "New Index Job" creates a draft in frontend state with name "Untitled index job", selects it, and opens the Files tab.
4. The detail header shows an editable name, a status chip, and explicit metadata labels (Created, Last edited, Last run).
5. The status chip derives correctly: `Draft` for unsaved, `Invalid` for saved-with-no-files, `Ready` for saved-and-valid, `Running`/`Failed`/`Complete` from latest job.
6. `Save draft` persists the source set. `Start run` is disabled until the job is saved and has files.
7. `Start run` triggers a pipeline job and the Runs tab auto-selects to show the 9-stage progress tracker.
8. The Artifacts tab shows downloadable deliverables from the most recent completed run.
9. Editing files or name on a `Ready` or `Complete` job shows `Unsaved changes` status and replaces `Start run` with `Save and start`.
10. All existing pipeline components (`PipelineNewRunForm`, `PipelineRunDetailPanel`, `PipelineRunsTable`) are no longer imported by the page. The workbench hook (`useIndexBuilderWorkbench`) is no longer used by the page.

## Locked Inventory Counts

### Backend
- Modified service modules: `1`
- New migrations: `0`
- New endpoints: `0`

### Frontend
- New top-level pages/routes: `0`
- Modified existing pages: `1`
- New visual components: `7`
- New hooks: `1`
- New utility modules: `1`
- Modified existing hooks: `1`
- Modified existing types: `2`

### Tests
- New test modules: `1`
- Modified existing test modules: `1`

## Locked File Inventory

### New files

- `web/src/lib/indexJobStatus.ts`
- `web/src/lib/indexJobStatus.test.ts`
- `web/src/hooks/useIndexBuilder.ts`
- `web/src/components/pipelines/IndexJobStatusChip.tsx`
- `web/src/components/pipelines/IndexJobsList.tsx`
- `web/src/components/pipelines/IndexJobHeader.tsx`
- `web/src/components/pipelines/IndexJobFilesTab.tsx`
- `web/src/components/pipelines/IndexJobConfigTab.tsx`
- `web/src/components/pipelines/IndexJobRunsTab.tsx`
- `web/src/components/pipelines/IndexJobArtifactsTab.tsx`

### Modified files

- `services/platform-api/app/services/pipeline_source_sets.py`
- `web/src/hooks/usePipelineSourceSet.ts`
- `web/src/lib/pipelineService.ts`
- `web/src/lib/pipelineSourceSetService.ts`
- `web/src/pages/IndexBuilderPage.tsx`
- `web/src/pages/IndexBuilderPage.test.tsx`

---

## Explicit Risks Accepted In This Plan

1. The existing `PipelineNewRunForm`, `PipelineRunDetailPanel`, and `PipelineRunsTable` components are not deleted in this plan — they are merely no longer imported by the page. They may be used by other pages or kept as reference. Cleanup is a separate concern.
2. The workbench hook `useIndexBuilderWorkbench.tsx` is not deleted — it may be useful for a power-user mode later. It is simply no longer the mounted page.
3. The backend `list_source_sets` endpoint currently loads `latest_job` with a per-row subquery. For large numbers of source sets this could be slow. This is accepted for v1; a joined query or batch fetch is a future optimization.
4. The `useIndexBuilder` hook manages both the list and the selected detail. If the hook grows too large, it can be split later. For v1 the single hook keeps orchestration simple.

---

## Tasks

### Task 1: Backend — Add `created_at` and `started_at` to responses

**File(s):** `services/platform-api/app/services/pipeline_source_sets.py`

**Step 1:** In `_load_latest_job_summary` (line 46), add `started_at` to the select and the returned dictionary:
```python
# Select: add started_at
.select("job_id, pipeline_kind, source_set_id, status, stage, started_at")

# Return dict: add started_at
"started_at": row.get("started_at"),
```

**Step 2:** In `list_source_sets` (line 96), add `created_at` to the select:
```python
.select("source_set_id, project_id, label, member_count, total_bytes, created_at, updated_at")
```
And add `created_at` to the serialized item dict (line 112):
```python
"created_at": row.get("created_at"),
```

**Step 3:** In `_serialize_source_set` (line 70), add `created_at` to the returned dict:
```python
"created_at": row.get("created_at"),
```

**Step 4:** Run existing backend tests to confirm no regressions.

**Test command:** `cd services/platform-api && python -m pytest tests/ -x -q`
**Expected output:** All existing tests pass. No assertion breaks since existing tests don't assert exact response shape exclusions.

**Commit:** `fix: add created_at and started_at to pipeline source set responses`

---

### Task 2: Frontend types + status derivation utility

**File(s):**
- `web/src/lib/pipelineService.ts`
- `web/src/lib/pipelineSourceSetService.ts`
- `web/src/lib/indexJobStatus.ts` (new)
- `web/src/lib/indexJobStatus.test.ts` (new)

**Step 1:** Update `PipelineSourceSetSummary` in `pipelineSourceSetService.ts`. The summary type is `Omit<PipelineSourceSet, 'items'>`, so add `created_at` to `PipelineSourceSet`:
```typescript
export type PipelineSourceSet = {
  source_set_id: string;
  project_id: string;
  label: string;
  member_count: number;
  total_bytes: number;
  created_at?: string;  // NEW
  updated_at?: string;
  items: PipelineSourceSetItem[];
  latest_job: PipelineJobSummary | null;
};
```

Update `PipelineJobSummary` in `pipelineService.ts` to add `started_at`:
```typescript
export type PipelineJobSummary = {
  job_id: string;
  pipeline_kind: string;
  source_set_id: string;
  status: string;
  stage: string;
  started_at?: string | null;  // NEW
};
```

**Step 2:** Create `web/src/lib/indexJobStatus.ts` with:
```typescript
import type { PipelineJobSummary } from './pipelineService';

export type IndexJobStatus = 'empty' | 'draft' | 'ready' | 'invalid' | 'running' | 'failed' | 'complete';

export type IndexJobViewModel = {
  id: string;                      // source_set_id
  name: string;                    // label
  status: IndexJobStatus;          // derived
  memberCount: number;
  totalBytes: number;
  createdAt: string | null;
  updatedAt: string | null;
  lastRunAt: string | null;        // from latest_job.started_at
  latestJob: PipelineJobSummary | null;
};

export function deriveIndexJobStatus(
  sourceSet: { source_set_id: string | null; member_count: number } | null,
  latestJob: { status: string } | null,
  hasUnsavedChanges: boolean,
): IndexJobStatus {
  if (!sourceSet) return 'empty';
  if (hasUnsavedChanges || !sourceSet.source_set_id) return 'draft';
  if (sourceSet.member_count === 0) return 'invalid';
  if (!latestJob) return 'ready';
  if (latestJob.status === 'queued' || latestJob.status === 'running') return 'running';
  if (latestJob.status === 'failed') return 'failed';
  if (latestJob.status === 'complete') return 'complete';
  return 'ready';
}
```

**Step 3:** Create `web/src/lib/indexJobStatus.test.ts` — test the derivation function against all cases from the state/CTA matrix:
- `null` source set → `'empty'`
- unsaved changes → `'draft'`
- `source_set_id: null` → `'draft'`
- `member_count: 0` → `'invalid'`
- no latest job → `'ready'`
- latest job `queued` → `'running'`
- latest job `running` → `'running'`
- latest job `failed` → `'failed'`
- latest job `complete` → `'complete'`
- latest job unknown status → `'ready'` (fallback)

**Step 4:** Run tests.

**Test command:** `cd web && npx vitest run src/lib/indexJobStatus.test.ts`
**Expected output:** All cases pass.

**Commit:** `feat: add IndexJobStatus types and deriveIndexJobStatus utility`

---

### Task 3: Extend `usePipelineSourceSet` with `resetSelection` and `loadSourceSet`

**File(s):** `web/src/hooks/usePipelineSourceSet.ts`

The existing hook does not expose methods to clear the selection state or load a specific source set by ID. The new `useIndexBuilder` hook needs both capabilities:
- `resetSelection()` for the "New Index Job" flow (clears selected sources, active source set, resets label)
- `loadSourceSet(sourceSetId)` for the "select job" flow (loads a specific source set's detail and hydrates selection)

**Step 1:** Add `resetSelection` callback:
```typescript
const resetSelection = useCallback(() => {
  setSelectedSourceUids([]);
  setActiveSourceSetId(null);
  setSourceSetLabel('');
  setSourceSetError(null);
}, []);
```

**Step 2:** Add `loadSourceSet` callback:
```typescript
const loadSourceSet = useCallback(async (sourceSetId: string) => {
  if (!pipelineKind) return null;
  try {
    setSourceSetError(null);
    const detail = await getPipelineSourceSet({ pipelineKind, sourceSetId });
    hydrateSourceSet(detail);
    return detail;
  } catch (error) {
    setSourceSetError(toErrorMessage(error, 'Unable to load the selected source set.'));
    return null;
  }
}, [hydrateSourceSet, pipelineKind]);
```

**Step 3:** Add both to the return object:
```typescript
return {
  // ... existing returns ...
  resetSelection,
  loadSourceSet,
};
```

**Step 4:** Verify TypeScript compiles and existing tests still pass.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors. The new methods are additive — no existing call sites break.

**Commit:** `feat: expose resetSelection and loadSourceSet from usePipelineSourceSet`

---

### Task 4: `useIndexBuilder` hook — scaffold and list loading

**File(s):** `web/src/hooks/useIndexBuilder.ts` (new)

**Step 1:** Create the hook file with imports and state declarations:
```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProjectFocus } from './useProjectFocus';
import { usePipelineJob } from './usePipelineJob';
import { usePipelineSourceSet } from './usePipelineSourceSet';
import { useResolvedPipelineService } from '@/pages/usePipelineServicesOverview';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import {
  listPipelineSourceSets,
  type PipelineSourceSetSummary,
} from '@/lib/pipelineSourceSetService';
import {
  uploadPipelineSource,
  downloadPipelineDeliverable,
  type PipelineDeliverable,
} from '@/lib/pipelineService';
import {
  deriveIndexJobStatus,
  type IndexJobStatus,
  type IndexJobViewModel,
} from '@/lib/indexJobStatus';
```

Declare state:
- `indexJobs: IndexJobViewModel[]` — all source sets mapped to view models
- `selectedJobId: string | null` — which job is selected (null = empty state, `'__new__'` = unsaved draft)
- `activeTab: 'files' | 'config' | 'runs' | 'artifacts'`
- `hasUnsavedChanges: boolean`
- `draftName: string` — editable name for the selected job
- `isRefreshing: boolean`

Compose inner hooks:
- `usePipelineSourceSet` for managing the selected job's source files
- `usePipelineJob` for the selected job's run lifecycle
- `useResolvedPipelineService('index-builder')` for pipeline kind resolution
- `useShellHeaderTitle` for breadcrumbs

**Step 2:** Implement `refreshList` to call `listPipelineSourceSets` and map results to `IndexJobViewModel[]`:
```typescript
const mapped: IndexJobViewModel = {
  id: item.source_set_id,
  name: item.label,
  status: deriveIndexJobStatus(
    { source_set_id: item.source_set_id, member_count: item.member_count },
    item.latest_job,
    false, // list items never show unsaved changes
  ),
  memberCount: item.member_count,
  totalBytes: item.total_bytes,
  createdAt: item.created_at ?? null,
  updatedAt: item.updated_at ?? null,
  lastRunAt: item.latest_job?.started_at ?? null,
  latestJob: item.latest_job,
};
```

**Step 3:** Add `useEffect` to call `refreshList` when `projectId` or `pipelineKind` changes.

**Step 4:** Return the list state and a stub return shape (empty functions for actions not yet implemented).

**Commit:** `feat: scaffold useIndexBuilder hook with list loading`

---

### Task 5: `useIndexBuilder` hook — selection and draft creation

**File(s):** `web/src/hooks/useIndexBuilder.ts`

**Step 1:** Implement `selectJob(id)`:
- Set `selectedJobId` to the given id
- Call `loadSourceSet(id)` from the source set hook (added in Task 3) to load and hydrate the specific source set
- Trigger `usePipelineJob` to fetch the latest job via `refreshLatestJob()`
- Set `hasUnsavedChanges` to `false`
- Set `draftName` to the source set's label

**Step 2:** Implement `createNewJob()`:
- Set `selectedJobId` to `'__new__'`
- Set `draftName` to `'Untitled index job'`
- Set `activeTab` to `'files'`
- Call `resetSelection()` from the source set hook (added in Task 3) to clear selected sources and active source set
- Set `hasUnsavedChanges` to `true`

**Step 3:** Derive `selectedJob` as a `useMemo`:
- If `selectedJobId` is null → null (empty state)
- If `selectedJobId` is `'__new__'` → synthetic `IndexJobViewModel` from draft state
- Otherwise → find in `indexJobs` list, derive status with `hasUnsavedChanges`

**Commit:** `feat: add selection and draft creation to useIndexBuilder`

---

### Task 6: `useIndexBuilder` hook — save, run, and upload actions

**File(s):** `web/src/hooks/useIndexBuilder.ts`

**Step 1:** Implement `saveDraft()`:
- Call `persistSourceSet()` from the source set hook (creates or updates)
- After save: call `refreshList()`, set `hasUnsavedChanges` to `false`
- If new draft (`selectedJobId === '__new__'`): update `selectedJobId` to the new `source_set_id`

**Step 2:** Implement `startRun()`:
- If `hasUnsavedChanges`: call `saveDraft()` first
- Call `triggerJob()` from the job hook
- Switch `activeTab` to `'runs'`

**Step 3:** Implement `retryRun()`:
- Call `triggerJob()` from the job hook (same source set)
- Switch `activeTab` to `'runs'`

**Step 4:** Implement `handleUpload(files: File[])`:
- For each file: call `uploadPipelineSource()`
- Call `refreshSources()` after all uploads complete
- Set `hasUnsavedChanges` to `true`

**Step 5:** Implement `handleDownload(deliverable: PipelineDeliverable)`:
- Call `downloadPipelineDeliverable()` to get blob
- Create object URL, trigger anchor download, revoke URL

**Step 6:** Update the return shape to include all implemented actions.

**Commit:** `feat: add save, run, and upload actions to useIndexBuilder`

---

### Task 7: `IndexJobStatusChip` component

**File(s):** `web/src/components/pipelines/IndexJobStatusChip.tsx` (new)

**Step 1:** Create the component. Maps `IndexJobStatus` to styled badge:
```typescript
import type { IndexJobStatus } from '@/lib/indexJobStatus';

const STATUS_STYLES: Record<IndexJobStatus, string> = {
  empty: '',
  draft: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  ready: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  invalid: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  running: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  failed: 'bg-destructive/15 text-destructive',
  complete: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

const STATUS_LABELS: Record<IndexJobStatus, string> = {
  empty: '',
  draft: 'Draft',
  ready: 'Ready',
  invalid: 'Invalid',
  running: 'Running',
  failed: 'Failed',
  complete: 'Complete',
};
```

**Step 2:** The component accepts two props:
```typescript
{
  status: IndexJobStatus;
  hasUnsavedChanges?: boolean;
}
```

When `hasUnsavedChanges` is `true` and `status` is not `'draft'`, the chip renders "Unsaved changes" with the `draft` style instead of the normal status label. This is a display override, not a new status value — the `IndexJobStatus` type stays unchanged.

**Commit:** `feat: add IndexJobStatusChip component`

---

### Task 8: `IndexJobsList` component (right pane)

**File(s):** `web/src/components/pipelines/IndexJobsList.tsx` (new)

**Step 1:** Create the component with props:
```typescript
{
  jobs: IndexJobViewModel[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  onNewJob: () => void;
}
```

**Step 2:** Implement:
- Header: "Index Jobs" label + "New Index Job" button (with `IconPlus`)
- Table columns: Name, Status, Last run, Updated
- Status column: uses `IndexJobStatusChip`
- Last run: formatted timestamp from `lastRunAt` or "—"
- Updated: formatted timestamp from `updatedAt`
- Row click: calls `onSelectJob(job.id)`
- Selected row: highlighted with `bg-accent/20` + stronger left border
- Sort order: running first, failed second, drafts third, then most recently updated
- Empty state: "No index jobs yet."

**Step 3:** Use `ScrollArea` for the table body (matches existing `PipelineRunsTable` pattern).

**Commit:** `feat: add IndexJobsList component for right-pane job list`

---

### Task 9: `IndexJobHeader` component (detail header)

**File(s):** `web/src/components/pipelines/IndexJobHeader.tsx` (new)

**Step 1:** Create the component with props:
```typescript
{
  name: string;
  status: IndexJobStatus;
  hasUnsavedChanges: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastRunAt: string | null;
  memberCount: number;
  onNameChange: (name: string) => void;
  onSaveDraft: () => void;
  onStartRun: () => void;
  onRetryRun: () => void;
  onDiscard: () => void;
  isSaving: boolean;
  isTriggering: boolean;
}
```

**Step 2:** Implement Line 1:
- Editable name input (text input styled as title, auto-focus on draft)
- Status chip (or "Unsaved changes" chip when applicable)

**Step 3:** Implement Line 2 metadata:
- "Created {timestamp}" — always shown (except draft)
- "Last edited {timestamp}" — shown when `updatedAt` exists
- "Last run {timestamp}" — shown when `lastRunAt` exists

**Step 4:** Implement header actions per the state/CTA matrix:
- `draft`: Primary = "Save draft", Secondary = "Discard"
- `invalid`: Secondary = "Delete" (disabled "Start run" with tooltip)
- `ready`: Primary = "Start run", Secondary = "Duplicate" (v2)
- `running`: Primary disabled "Running…"
- `failed`: Primary = "Retry run"
- `complete`: Primary = "Run again"
- `hasUnsavedChanges && status !== 'draft'`: Primary = "Save and start", Secondary = "Save changes"

**Commit:** `feat: add IndexJobHeader with state-gated CTAs and editable name`

---

### Task 10: `IndexJobFilesTab` component

**File(s):** `web/src/components/pipelines/IndexJobFilesTab.tsx` (new)

**Step 1:** Create `IndexJobFilesTab` with props:
```typescript
{
  sources: PipelineSource[];
  selectedSourceUids: string[];
  sourcesLoading: boolean;
  sourcesError: string | null;
  onToggleSource: (sourceUid: string) => void;
  onUpload: (files: File[]) => Promise<void>;
  onRemoveSource: (sourceUid: string) => void;
}
```

**Step 2:** Implement large drop zone (per design doc section 8.2):
- Title: "Drop markdown files here"
- Supporting text: "or click to browse"
- Helper text: "Accepted: .md, .markdown"
- Significantly larger than the current mock (min-height ~160px, rounded-2xl, dashed border)
- Drag-over visual state

**Step 3:** Implement file list:
- Each row: filename, size (formatted KB/MB), remove button
- Selected indicator (checkbox or highlight)

**Step 4:** Implement footer summary:
- "{n} files uploaded"
- "Total size: {size}"

**Step 5:** Implement validation notices for edge cases:
- Duplicate filename warning
- Unsupported file type rejection
- Empty file warning

**Commit:** `feat: add IndexJobFilesTab component with drop zone and file list`

---

### Task 11: `IndexJobConfigTab` component

**File(s):** `web/src/components/pipelines/IndexJobConfigTab.tsx` (new)

**Step 1:** Create `IndexJobConfigTab` as a stub:
- Section heading: "Processing configuration"
- Read-only fields: Source type = "Markdown", Chunking = "Auto (512 tokens)", Embedding = "Auto-resolved from user settings"
- Note: "Configuration options will be available in a future update."

**Commit:** `feat: add IndexJobConfigTab stub component`

---

### Task 12: `IndexJobRunsTab` component

**File(s):** `web/src/components/pipelines/IndexJobRunsTab.tsx` (new)

**Step 1:** Create the component with props:
```typescript
{
  job: PipelineJob | null;
  isPolling: boolean;
  jobLoading: boolean;
  jobError: string | null;
}
```

**Step 2:** Implement the 9-stage progress tracker. Reuse the stage resolution logic from `PipelineJobStatusPanel.tsx` (the `STAGE_DISPLAY` array and `toStageState` function — copy, don't import, since we'll retire the original):
- Each stage: name left, state label right
- Color coding: emerald=done, sky=in-progress, red=failed, muted=pending
- Failed stage shows inline error message

**Step 3:** Implement run metadata header:
- "Run started {timestamp}" (from `job.started_at`)
- Current step summary
- Elapsed time (computed from `started_at` to now or `completed_at`)

**Step 4:** Implement stats on completion:
- Grid: Sections count, Chunks count, Embedding model

**Step 5:** Implement error summary on failure:
- Red box: "Failed at: {failure_stage}" + error message

**Step 6:** Empty state when no job exists:
- "No runs yet — start a run to see progress here."

**Step 7:** Polling indicator when active:
- "Polling for updates…" (matches existing pattern)

**Commit:** `feat: add IndexJobRunsTab with stage progress tracker`

---

### Task 13: `IndexJobArtifactsTab` component

**File(s):** `web/src/components/pipelines/IndexJobArtifactsTab.tsx` (new)

**Step 1:** Create the component with props:
```typescript
{
  job: PipelineJob | null;
  onDownload: (deliverable: PipelineDeliverable) => Promise<void>;
  downloadError: string | null;
  downloadingKind: string | null;
}
```

**Step 2:** Implement artifact rows:
- Each deliverable: filename, kind label, size, timestamp, "Download" button
- Download button disabled until job complete
- "Downloading…" state while in progress

**Step 3:** Empty state:
- No completed run: "No artifacts yet — run this job to generate outputs."
- Completed run, no deliverables: "This run completed but produced no artifacts."

**Commit:** `feat: add IndexJobArtifactsTab with deliverable download`

---

### Task 14: `IndexBuilderPage.tsx` — two-pane shell and empty state

**File(s):** `web/src/pages/IndexBuilderPage.tsx`

**Step 1:** Remove all existing content. Remove imports for `PipelineRunsTable`, `PipelineRunDetailPanel`, `PipelineNewRunForm`, and `MOCK_RUNS_FULL`.

**Step 2:** Import the new hook and components:
```typescript
import { useIndexBuilder } from '@/hooks/useIndexBuilder';
import { IndexJobsList } from '@/components/pipelines/IndexJobsList';
import { IndexJobHeader } from '@/components/pipelines/IndexJobHeader';
import { IndexJobFilesTab } from '@/components/pipelines/IndexJobFilesTab';
import { IndexJobConfigTab } from '@/components/pipelines/IndexJobConfigTab';
import { IndexJobRunsTab } from '@/components/pipelines/IndexJobRunsTab';
import { IndexJobArtifactsTab } from '@/components/pipelines/IndexJobArtifactsTab';
```

**Step 3:** Implement the two-pane layout shell:
```tsx
<div className="flex h-full min-h-0 gap-3 p-3">
  {/* Left pane — selected job detail */}
  <div className="flex min-h-0 min-w-0 flex-[2] flex-col rounded-lg border border-border bg-card">
    {/* Empty state OR selected job */}
  </div>

  {/* Right pane — job list */}
  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    <IndexJobsList ... />
  </div>
</div>
```

Note: left pane is `flex-[2]` (66%), right pane is `flex-1` (34%). This matches the design doc's emphasis on the detail pane being the primary surface.

**Step 4:** Implement the empty state (left pane when no selection):
- Title: "Index Builder"
- Description: "Upload markdown files, configure processing, and generate search-ready artifacts."
- Bullets: Markdown accepted, produces SQLite + semantic archive, step-by-step monitoring
- CTA: "New Index Job" button

**Step 5:** Wire `useIndexBuilder` hook. Pass `indexJobs`, `selectedJobId`, `onSelectJob`, `onNewJob` to `IndexJobsList`. Render empty state when `selectedJobId` is null.

**Commit:** `feat: IndexBuilderPage two-pane shell with empty state and job list`

---

### Task 15: `IndexBuilderPage.tsx` — selected job detail with header and tabs

**File(s):** `web/src/pages/IndexBuilderPage.tsx`

**Step 1:** Add the selected-job detail pane (when `selectedJobId` is not null):
- `IndexJobHeader` at top
- Tab bar: Files | Config | Runs | Artifacts (4 buttons, `activeTab` state controls which is highlighted)

**Step 2:** Implement tab content switching:
- `activeTab === 'files'` → render `IndexJobFilesTab`
- `activeTab === 'config'` → render `IndexJobConfigTab`
- `activeTab === 'runs'` → render `IndexJobRunsTab`
- `activeTab === 'artifacts'` → render `IndexJobArtifactsTab`

**Step 3:** Wire all props from the hook to each component (header actions, file operations, job state, download handlers).

**Commit:** `feat: IndexBuilderPage selected job detail with header and tab switching`

---

### Task 16: `IndexBuilderPage.tsx` — auto-tab-switch and final wiring

**File(s):** `web/src/pages/IndexBuilderPage.tsx`

**Step 1:** Implement auto-tab-switch: when the selected job's derived status transitions to `running`, switch `activeTab` to `'runs'`. Use a `useEffect` watching the derived status.

**Step 2:** Verify that no import of `PipelineRunsTable`, `PipelineRunDetailPanel`, `PipelineNewRunForm`, or `MOCK_RUNS_FULL` exists.

**Step 3:** Verify TypeScript compiles: `npx tsc --noEmit`.

**Commit:** `feat: IndexBuilderPage auto-tab-switch on run start`

---

### Task 17: Page tests — setup and rendering tests

**File(s):** `web/src/pages/IndexBuilderPage.test.tsx`

**Step 1:** Remove all existing test content.

**Step 2:** Set up mocks for `useIndexBuilder` hook, `useShellHeaderTitle`, `useProjectFocus`. Create a helper `renderPage()` that wraps in `MemoryRouter`.

**Step 3:** Write test:
1. **Renders empty state with intro card and "New Index Job" button** — verify heading "Index Builder", description text, CTA button

**Step 4:** Write test:
2. **Renders Index Jobs list with correct heading** — mock `indexJobs` with 2 items, verify "Index Jobs" heading and row labels

**Step 5:** Write test:
3. **Selecting a job populates the detail pane** — click a row, verify header shows job name and status chip

**Test command:** `cd web && npx vitest run src/pages/IndexBuilderPage.test.tsx`
**Expected output:** 3 tests pass.

**Commit:** `test: IndexBuilderPage rendering and selection tests`

---

### Task 18: Page tests — state transitions and CTA gating

**File(s):** `web/src/pages/IndexBuilderPage.test.tsx`

**Step 1:** Write test:
4. **Creating a new job shows draft state** — click "New Index Job", verify "Draft" chip, "Save draft" button visible, Files tab active

**Step 2:** Write test:
5. **Save draft enables Start run** — mock save action completing, verify status transitions from Draft → Ready and "Start run" button appears

**Step 3:** Write test:
6. **Start run switches to Runs tab** — mock trigger, verify tab switches and progress tracker is visible

**Step 4:** Write test:
7. **Unsaved changes shows correct CTA** — modify name on a saved job, verify "Save and start" appears instead of "Start run"

**Step 5:** Write test:
8. **Artifacts tab shows deliverables** — mock completed job with deliverables, click Artifacts tab, verify download buttons

**Test command:** `cd web && npx vitest run src/pages/IndexBuilderPage.test.tsx`
**Expected output:** All 8 tests pass.

**Commit:** `test: IndexBuilderPage state transition and CTA gating tests`

---

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked acceptance contract (10 items) is verified against the running application.
2. The locked inventory counts match the actual set of created and modified files.
3. All new frontend tests pass (`npx vitest run`).
4. Existing backend tests pass (`python -m pytest tests/ -x -q`).
5. No import of `PipelineRunsTable`, `PipelineRunDetailPanel`, or `PipelineNewRunForm` exists in `IndexBuilderPage.tsx`.
6. No reference to `MOCK_RUNS_FULL` or hardcoded mock data exists in `IndexBuilderPage.tsx`.
7. The TypeScript build succeeds without errors (`npx tsc --noEmit`).