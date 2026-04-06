# Index Builder Frontend Completion Plan

**Goal:** Fix the six known bugs and close the major feature gaps in the Index Builder page so the two-pane layout feels like a single coherent surface. The backend is complete — this plan is frontend-only.

**Architecture:** The page is a two-pane list+detail layout over three existing backend entities: `pipeline_source_sets` (Index Job), `pipeline_jobs` (Run), and `pipeline_deliverables` (Artifact). The page-level hook `useIndexBuilder` composes `usePipelineSourceSet` and `usePipelineJob`. All product decisions in `docs/plans/index-builder-redesign-dev-notes.md` remain authoritative. This plan fixes bugs introduced by the prior incomplete implementation, adds loading/error states that bridge the two panes, refreshes the list on run completion, and adds file validation. The orphaned workbench variant is deleted.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, existing `Skeleton` and `Sheet` UI primitives.

**Status:** Draft for discussion
**Author:** Claude (requested by Jon)
**Date:** 2026-04-01
**Derived from:** `docs/plans/index-builder-redesign-dev-notes.md` (design authority), `docs/plans/2026-04-01-index-builder-redesign-implementation-plan.md` (prior plan, never approved)

---

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any locked item below needs to change, implementation must stop and this plan must be revised first.

---

## Manifest

### Platform API

No platform API endpoints are created, modified, or consumed differently. The backend is complete. All existing pipeline routes are reused exactly as-is:

- `GET /{pipeline_kind}/source-sets` — list source sets (has `created_at`)
- `GET /{pipeline_kind}/source-sets/{source_set_id}` — detail (has `created_at`)
- `POST /{pipeline_kind}/source-sets` — create
- `PATCH /{pipeline_kind}/source-sets/{source_set_id}` — update
- `GET /{pipeline_kind}/sources` — list uploaded sources
- `POST /storage/uploads` + `POST /storage/uploads/{reservation_id}/complete` — file upload
- `GET /{pipeline_kind}/jobs/latest` — latest job for source set
- `POST /{pipeline_kind}/jobs` — trigger job
- `GET /jobs/{job_id}` — poll job status with deliverables
- `GET /jobs/{job_id}/deliverables/{kind}/download` — download artifact

New platform API endpoints: `0`
Modified platform API endpoints: `0`

### Observability

No observability changes. This is a frontend-only plan. All backend traces, metrics, and structured logs remain unchanged.

### Database Migrations

No database migrations. All required tables exist.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** `0`

**New components:** `0`

**New hooks:** `0`

**New libraries/services:** `0`

**Modified pages:** `1`

| Page | File | What changes |
|------|------|--------------|
| `IndexBuilderPage` | `web/src/pages/IndexBuilderPage.tsx` | Fix discard handler, add loading skeleton for left pane, add `onRunComplete` callback for list refresh |

**Modified components:** `3`

| Component | File | What changes |
|-----------|------|--------------|
| `IndexJobFilesTab` | `web/src/components/pipelines/IndexJobFilesTab.tsx` | Add file validation warnings (duplicates, empty files); add section headers to distinguish selected files from available files |
| `IndexJobHeader` | `web/src/components/pipelines/IndexJobHeader.tsx` | Accept `onDiscard` as a proper revert action (not a re-select) |
| `IndexJobsList` | `web/src/components/pipelines/IndexJobsList.tsx` | Accept refreshed `jobs` array (no component changes — the list already renders from props) |

**Modified hooks:** `2`

| Hook | File | What changes |
|------|------|--------------|
| `useIndexBuilder` | `web/src/hooks/useIndexBuilder.ts` | Fix discard action, add `isSelecting` loading flag, refresh list on run completion, sync status chip in list after local edits |
| `usePipelineSourceSet` | `web/src/hooks/usePipelineSourceSet.ts` | Fix default label from `'Release corpus'` to `''`, guard `refreshSourceSet` against auto-selecting when page-level selection is `null` |

**Modified test files:** `1`

| Test | File | What changes |
|------|------|--------------|
| `IndexBuilderPage.test` | `web/src/pages/IndexBuilderPage.test.tsx` | Add tests for loading state, discard behavior, list refresh on run completion, file validation |

**Deleted files:** `1`

| File | Why |
|------|-----|
| `web/src/pages/useIndexBuilderWorkbench.tsx` | Orphaned — not imported by any code. The only consumer was the old workbench-style page, which was replaced. |

---

## Frozen Seam Contract: Workbench Deletion

### File being deleted

`web/src/pages/useIndexBuilderWorkbench.tsx` — a hook that composed `usePipelineSourceSet`, `usePipelineJob`, and the shared Pipeline* panel components into a workbench-style tabbed interface.

### Why safe to delete

1. No file in the codebase imports `useIndexBuilderWorkbench` (verified by grep — only the file itself appears).
2. The current route at `/app/pipeline-services/index-builder` mounts `IndexBuilderPage.tsx`, not the workbench variant.
3. The shared Pipeline* panel components (`PipelineUploadPanel`, `PipelineSourceFilesPanel`, `PipelineSourceSetPanel`, `PipelineJobStatusPanel`, `PipelineDeliverablesPanel`) are NOT deleted — they have their own test files and may be used by future pipeline service pages.

### What must NOT be deleted

| File | Why it stays |
|------|-------------|
| `web/src/components/pipelines/PipelineUploadPanel.tsx` | Has own test file, shared infrastructure |
| `web/src/components/pipelines/PipelineSourceFilesPanel.tsx` | Has own test file, shared infrastructure |
| `web/src/components/pipelines/PipelineSourceSetPanel.tsx` | Has own test file, shared infrastructure |
| `web/src/components/pipelines/PipelineJobStatusPanel.tsx` | Has own test file, shared infrastructure |
| `web/src/components/pipelines/PipelineDeliverablesPanel.tsx` | Has own test file, shared infrastructure |

---

## Locked Product Decisions

1. The design authority is `docs/plans/index-builder-redesign-dev-notes.md`. All decisions in that document remain binding.
2. The two-pane layout (left detail 66%, right list 34%) is kept. No layout change.
3. The four-tab structure (Files, Config, Runs, Artifacts) is kept. No tab additions.
4. Config tab remains a read-only stub (backend chunking is hardcoded).
5. Cancellation remains out of scope (no backend endpoint).
6. Inline logs remain out of scope. Progress + status only.
7. Delete action is deferred — no `DELETE /source-sets` endpoint exists in the backend. The header and row overflow menu do not include delete in this plan.
8. Duplicate action is deferred — requires a backend endpoint or client-side clone + create flow that is out of scope.
9. Row overflow menu (design notes section 12.5) is deferred — the actions it would contain (Duplicate, Delete, Rename, Run again) either need backend endpoints that don't exist or duplicate existing header CTAs.
10. Run history per job (design notes section 8.8) is deferred to a separate plan — requires either a new `GET /{pipeline_kind}/jobs?source_set_id=` list endpoint or client-side accumulation. The Runs tab continues to show the latest run only.
11. One active run per source set (backend-enforced constraint). No change.
12. The `usePipelineSourceSet` hook is shared infrastructure used by both the Index Builder page and potentially future pipeline pages. Changes to it must be backward-compatible.

---

## Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. **Discard works on new drafts:** Click "New Index Job" → click "Discard" → left pane returns to empty state, `selectedJobId` is `null`, no job is selected in the right list.
2. **Discard works on existing jobs:** Select a saved job → edit the name → click "Discard" → name reverts to the saved value, `hasUnsavedChanges` is `false`, status chip shows the original status (not "Unsaved changes").
3. **No stale default label:** Creating a new job shows "Untitled index job" as the name, never "Release corpus."
4. **No auto-select on mount:** When the page loads with no job selected, the inner source set hook does not hydrate with the first source set. The left pane shows the empty state cleanly.
5. **Loading skeleton on job selection:** Click a job in the right list → left pane immediately shows a skeleton/loading state → skeleton is replaced by the job detail once `loadSourceSet` and `refreshLatestJob` complete.
6. **Error handling on job selection:** If `loadSourceSet` fails, the left pane shows an error message instead of going blank.
7. **List refreshes on run completion:** When a run transitions to `complete` or `failed` (detected by polling), the right-side list refreshes automatically. The status chip in the list updates to match.
8. **File validation warnings:** Uploading a duplicate filename shows an inline warning. Uploading an empty file (0 bytes) shows an inline warning.
9. **Workbench file deleted:** `web/src/pages/useIndexBuilderWorkbench.tsx` no longer exists. No import references it.
10. **All existing tests pass:** `cd web && npx vitest run src/pages/IndexBuilderPage.test.tsx` and `cd web && npx vitest run src/lib/indexJobStatus.test.ts` continue to pass.
11. **New tests pass:** Tests for loading state, discard, list refresh on run completion, and file validation all pass.
12. **TypeScript compiles:** `cd web && npx tsc --noEmit` produces no errors.

---

## Locked Inventory Counts

### Backend

- New/modified backend files: `0`
- New migrations: `0`
- New endpoints: `0`

### Frontend

- New pages: `0`
- New components: `0`
- New hooks: `0`
- Modified pages: `1`
- Modified components: `3`
- Modified hooks: `2`
- Deleted files: `1`

### Tests

- New test files: `0`
- Modified test files: `1`

---

## Locked File Inventory

### New files

None.

### Modified files

- `web/src/hooks/usePipelineSourceSet.ts`
- `web/src/hooks/useIndexBuilder.ts`
- `web/src/pages/IndexBuilderPage.tsx`
- `web/src/components/pipelines/IndexJobHeader.tsx`
- `web/src/components/pipelines/IndexJobFilesTab.tsx`
- `web/src/pages/IndexBuilderPage.test.tsx`

### Deleted files

- `web/src/pages/useIndexBuilderWorkbench.tsx`

---

## Explicit Risks Accepted In This Plan

1. **Run history deferred.** The Runs tab continues to show only the latest run. A proper run history requires a list endpoint or client-side accumulation. This is a separate plan.
2. **Delete and Duplicate deferred.** No `DELETE` endpoint exists for source sets. These actions require backend work that is out of scope.
3. **Row overflow menu deferred.** Its useful actions (Delete, Duplicate) require the deferred backend work. Rename and Run again are already available via the detail header.
4. **`usePipelineSourceSet` auto-select guard uses a new parameter.** The guard is a backward-compatible addition (`skipAutoSelect?: boolean`), but the workbench variant (if it were still alive) would not pass it. Since the workbench is deleted in this plan, this is safe.
5. **File validation is client-side only.** Duplicate filename and empty file checks happen in the browser before upload. The backend does not reject duplicates — it creates a new source with the same name. This is acceptable for v1.
6. **Status chip sync in list is a simple re-derive, not a websocket push.** Task 3 Step 3 patches the `indexJobs` array entry for the selected job when `hasUnsavedChanges` or `draftName` changes. This means the list chip updates only for the selected job, not for all jobs. Cross-job status updates still require `refreshList()`.

---

## Tasks

### Task 1: Fix default label and auto-select-on-mount in usePipelineSourceSet

**File(s):** `web/src/hooks/usePipelineSourceSet.ts`

**Step 1:** Change the default `sourceSetLabel` state from `'Release corpus'` to `''` at line 36:
```typescript
const [sourceSetLabel, setSourceSetLabel] = useState('');
```

**Step 2:** Add a `skipAutoSelect` option to the hook's options type:
```typescript
type UsePipelineSourceSetOptions = {
  projectId: string | null;
  pipelineKind: string | null;
  skipAutoSelect?: boolean;
};
```

**Step 3:** Destructure `skipAutoSelect` in the hook parameters and guard the auto-select logic in `refreshSourceSet` at line 86:
```typescript
const targetSourceSetId = activeSourceSetId ?? (skipAutoSelect ? null : items[0]?.source_set_id ?? null);
```

**Step 4:** Guard the mount effect at lines 100-112 so that `refreshSourceSet()` is not called when `skipAutoSelect` is true and no source set has been explicitly selected. Replace line 111:
```typescript
// Before (always calls both):
void refreshSources();
void refreshSourceSet();

// After (only loads source pool on mount; source set loading waits for explicit selection):
void refreshSources();
if (!skipAutoSelect || activeSourceSetId) {
  void refreshSourceSet();
}
```
This prevents the mount effect from hydrating a source set when the page starts with no job selected. The source pool (`refreshSources`) still loads so files are available when the user creates or selects a job. `refreshSourceSet` only runs when either `skipAutoSelect` is false (backward-compatible for other callers) or `activeSourceSetId` has been set by an explicit `loadSourceSet` call.

**Step 5:** Verify TypeScript compiles.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors. The new option is optional, so existing call sites are unaffected.

**Commit:** `fix: remove hardcoded default label and add skipAutoSelect guard to usePipelineSourceSet`

---

### Task 2: Fix discard action and add loading/error state to useIndexBuilder

**File(s):** `web/src/hooks/useIndexBuilder.ts`

**Step 1:** Pass `skipAutoSelect: true` to `usePipelineSourceSet` at line 33-36:
```typescript
const pipelineSourceSet = usePipelineSourceSet({
  projectId: resolvedProjectId,
  pipelineKind,
  skipAutoSelect: true,
});
```

**Step 2:** Add `isSelecting` and `selectError` state:
```typescript
const [isSelecting, setIsSelecting] = useState(false);
const [selectError, setSelectError] = useState<string | null>(null);
```

**Step 3:** Add a `savedName` ref to track the last-saved name for revert:
```typescript
const [savedName, setSavedName] = useState('');
```

**Step 4:** Update `selectJob` to set loading state and handle errors:
```typescript
const selectJob = useCallback(async (id: string) => {
  setSelectedJobId(id);
  setHasUnsavedChanges(false);
  setActiveTab('files');
  setSelectError(null);
  setIsSelecting(true);
  try {
    const detail = await pipelineSourceSet.loadSourceSet(id);
    if (detail) {
      setDraftName(detail.label);
      setSavedName(detail.label);
    }
    await pipelineJob.refreshLatestJob(id);
  } catch (error) {
    setSelectError(error instanceof Error ? error.message : 'Unable to load the selected job.');
  } finally {
    setIsSelecting(false);
  }
}, [pipelineSourceSet, pipelineJob]);
```

**Step 5:** Implement `discardChanges` as a proper revert action:
```typescript
const discardChanges = useCallback(() => {
  if (selectedJobId === '__new__') {
    // Discard new draft: return to empty state
    setSelectedJobId(null);
    setDraftName('');
    setSavedName('');
    setHasUnsavedChanges(false);
    pipelineSourceSet.resetSelection();
  } else {
    // Revert to saved name
    setDraftName(savedName);
    setHasUnsavedChanges(false);
  }
}, [selectedJobId, savedName, pipelineSourceSet]);
```

**Step 6:** Update `saveDraft` to also update `savedName`:
```typescript
// Inside saveDraft, after save succeeds:
setSavedName(draftName.trim() || 'Untitled index job');
```

**Step 7:** Update `createNewJob` to also set `savedName`:
```typescript
const createNewJob = useCallback(() => {
  setSelectedJobId('__new__');
  setDraftName('Untitled index job');
  setSavedName('');
  setActiveTab('files');
  pipelineSourceSet.resetSelection();
  pipelineSourceSet.setSourceSetLabel('Untitled index job');
  setHasUnsavedChanges(true);
}, [pipelineSourceSet]);
```

**Step 8:** Add `isSelecting`, `selectError`, and `discardChanges` to the return object. Remove the old inline `setDraftName` wrapper and replace with a named callback that also does not set `savedName`.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors.

**Commit:** `fix: proper discard, loading state, and error handling in useIndexBuilder`

---

### Task 3: Refresh list on run completion

**File(s):** `web/src/hooks/useIndexBuilder.ts`

**Step 1:** Add a `useEffect` that watches `pipelineJob.job?.status` and calls `refreshList` when it transitions to a terminal state:
```typescript
const prevJobStatusRef = useRef<string | null>(null);

useEffect(() => {
  const currentStatus = pipelineJob.job?.status ?? null;
  const prevStatus = prevJobStatusRef.current;
  prevJobStatusRef.current = currentStatus;

  if (
    prevStatus &&
    prevStatus !== currentStatus &&
    (currentStatus === 'complete' || currentStatus === 'failed')
  ) {
    void refreshList();
  }
}, [pipelineJob.job?.status, refreshList]);
```

**Step 2:** Add `useRef` to the imports at line 1.

**Step 3:** Add list-chip status sync. When `hasUnsavedChanges` or `draftName` changes on the selected job, patch the corresponding entry in the `indexJobs` array so the right-side list chip reflects the current state:
```typescript
// In the selectedJob useMemo, also update the list entry for the selected job
// so the right-side list chip stays in sync with the left pane.
useEffect(() => {
  if (!selectedJobId || selectedJobId === '__new__') return;
  setIndexJobs((prev) =>
    prev.map((job) =>
      job.id === selectedJobId
        ? {
            ...job,
            name: draftName || job.name,
            status: deriveIndexJobStatus(
              { source_set_id: job.id, member_count: job.memberCount },
              job.latestJob,
              hasUnsavedChanges,
            ),
          }
        : job,
    ),
  );
}, [selectedJobId, hasUnsavedChanges, draftName]);
```
This ensures the list row for the selected job shows "Unsaved changes" when the left pane does, and reverts when discard or save clears the flag.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors.

**Commit:** `fix: refresh index job list when run reaches terminal status and sync list chip on edits`

---

### Task 4: Wire loading state and fixed discard into IndexBuilderPage

**File(s):** `web/src/pages/IndexBuilderPage.tsx`

**Step 1:** Import `Skeleton` from `@/components/ui/skeleton`.

**Step 2:** Replace the `onDiscard` prop from:
```typescript
onDiscard={() => ib.selectJob(ib.selectedJobId === '__new__' ? '' : ib.selectedJobId!)}
```
to:
```typescript
onDiscard={ib.discardChanges}
```

**Step 3:** Add a loading state branch in the left pane, between the empty state and the selected job detail. When `ib.isSelecting` is true, show a skeleton:
```tsx
{ib.isSelecting ? (
  <div className="flex flex-1 flex-col gap-3 p-4">
    <Skeleton className="h-8 w-2/3" />
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="mt-4 h-48 w-full" />
  </div>
) : !ib.selectedJob ? (
  /* Empty state */
  ...
) : (
  /* Selected job detail */
  ...
)}
```

**Step 4:** Add an error state branch. When `ib.selectError` is truthy and `ib.selectedJob` is null, show the error:
```tsx
{ib.selectError && !ib.selectedJob ? (
  <div className="flex flex-1 flex-col items-center justify-center px-5 py-6 text-center">
    <p className="text-sm text-destructive">{ib.selectError}</p>
  </div>
) : null}
```

**Step 5:** Verify TypeScript compiles.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors.

**Commit:** `fix: wire loading skeleton and proper discard into IndexBuilderPage`

---

### Task 5: Add file validation warnings to IndexJobFilesTab

**File(s):** `web/src/components/pipelines/IndexJobFilesTab.tsx`

**Step 1:** Add a `useMemo` that computes validation warnings from the `sources` and `selectedSourceUids` arrays:
```typescript
const fileWarnings = useMemo(() => {
  const warnings: { sourceUid: string; message: string }[] = [];
  const seenNames = new Map<string, string>();
  for (const source of sources) {
    if (!selectedSourceUids.includes(source.source_uid)) continue;
    // Duplicate filename check
    const existing = seenNames.get(source.doc_title);
    if (existing) {
      warnings.push({ sourceUid: source.source_uid, message: `Duplicate filename: "${source.doc_title}"` });
    } else {
      seenNames.set(source.doc_title, source.source_uid);
    }
    // Empty file check
    if ((source.byte_size ?? 0) === 0) {
      warnings.push({ sourceUid: source.source_uid, message: `Empty file: "${source.doc_title}" (0 bytes)` });
    }
  }
  return warnings;
}, [sources, selectedSourceUids]);
```

**Step 2:** Render warnings below the file list, before the footer summary:
```tsx
{fileWarnings.length > 0 ? (
  <div className="space-y-1">
    {fileWarnings.map((warning, index) => (
      <div key={`${warning.sourceUid}-${index}`} className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
        {warning.message}
      </div>
    ))}
  </div>
) : null}
```

**Step 3:** Add section headers to visually separate selected files from available files. Above the file list, render two groups:
```tsx
{/* Selected files for this job */}
{selectedSources.length > 0 ? (
  <div className="space-y-1">
    <h4 className="text-xs font-medium text-muted-foreground">Selected for this job</h4>
    {selectedSources.map((source) => (
      /* existing selected file row rendering */
    ))}
  </div>
) : null}

{/* Available files not yet selected */}
{unselectedSources.length > 0 ? (
  <div className="space-y-1">
    <h4 className="text-xs font-medium text-muted-foreground">Available to add</h4>
    {unselectedSources.map((source) => (
      /* existing unselected file row rendering */
    ))}
  </div>
) : null}
```
Derive `selectedSources` and `unselectedSources` from the existing `sources` and `selectedSourceUids` arrays. The existing `selectedSources` computation at line 33 already does the filter for selected; add the inverse for unselected.

**Step 4:** Add `useMemo` to the imports.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors.

**Commit:** `feat: add file validation warnings and section headers to IndexJobFilesTab`

---

### Task 6: Delete orphaned workbench file

**File(s):** `web/src/pages/useIndexBuilderWorkbench.tsx`

**Step 1:** Delete the file.

**Step 2:** Verify no import references it: `grep -r "useIndexBuilderWorkbench" web/src/`.

**Step 3:** Verify TypeScript compiles.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors.

**Commit:** `chore: delete orphaned useIndexBuilderWorkbench hook`

---

### Task 7: Update tests for new behavior

**File(s):** `web/src/pages/IndexBuilderPage.test.tsx`

**Step 1:** Add test: "discard on new draft returns to empty state." Click "New Index Job" → verify draft state → click "Discard" → verify empty state returns (heading "Index Builder" visible, no job selected).

**Step 2:** Add test: "discard on existing job reverts name." Select a job → edit name → click "Discard" → verify name reverts to original value, "Unsaved changes" chip disappears.

**Step 3:** Add test: "loading skeleton appears during job selection." Mock `loadSourceSet` to return a delayed promise → click a job → verify skeleton elements appear → resolve promise → verify job detail appears.

**Step 4:** Add test: "error state appears when job selection fails." Mock `loadSourceSet` to reject → click a job → verify error message appears.

**Step 5:** Run all tests.

**Test command:** `cd web && npx vitest run src/pages/IndexBuilderPage.test.tsx`
**Expected output:** All tests pass (existing 7 + new 4 = 11 tests).

**Commit:** `test: add tests for discard, loading state, and error handling`

---

### Task 8: Final verification

**File(s):** All modified files.

**Step 1:** Run full test suite: `cd web && npx vitest run src/pages/IndexBuilderPage.test.tsx src/lib/indexJobStatus.test.ts`.
**Step 2:** Run TypeScript check: `cd web && npx tsc --noEmit`.
**Step 3:** Verify `useIndexBuilderWorkbench.tsx` does not exist.
**Step 4:** Verify no reference to `'Release corpus'` exists in hook files.
**Step 5:** Verify `skipAutoSelect: true` is passed in `useIndexBuilder.ts`.
**Step 6:** Walk through the locked acceptance contract items 1-12.

**Test command:** Full test suite (command above).
**Expected output:** All tests pass, all acceptance criteria met.

**Commit:** No commit — verification only.

---

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked file inventory matches the actual set of modified and deleted files.
2. The locked inventory counts match reality.
3. The locked acceptance contract (12 items) passes end-to-end.
4. All existing tests continue to pass.
5. All new tests pass.
6. TypeScript compiles without errors.
7. `useIndexBuilderWorkbench.tsx` no longer exists and no import references it.
8. The default source set label is `''`, not `'Release corpus'`.
9. The `usePipelineSourceSet` hook does not auto-select a source set when `skipAutoSelect` is `true`.
10. The discard action on a new draft returns to the empty state (not a no-op).
11. The discard action on an existing job reverts the name to the last-saved value.
12. The right-side list refreshes when a run reaches terminal status.
