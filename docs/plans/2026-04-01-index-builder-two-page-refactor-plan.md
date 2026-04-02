# Index Builder Two-Page Refactor Implementation Plan

**Goal:** Replace the current two-pane single-page Index Builder with a two-page architecture: a full-page Index Jobs registry table, and a single-page job detail that consolidates file upload, configuration, run execution, progress logging, and artifact downloads into one continuous surface.

**Architecture:** The refactor splits `IndexBuilderPage.tsx` into two pages. Page 1 (`IndexBuilderListPage`) is the Index Jobs registry — a full-page table the user lands on. Page 2 (`IndexBuilderJobPage`) is the job detail — one scrollable surface with file upload, file table with checkboxes, config alongside files, a Run button, a log-style progress area, and always-visible download buttons. The orchestrator hook `useIndexBuilder` is decomposed into two page-specific hooks. All 7 existing components, both sub-hooks (`usePipelineSourceSet`, `usePipelineJob`), and all 3 service modules are reused without modification. The backend is complete — no backend changes.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, react-router-dom.

**Status:** Draft for discussion
**Author:** Claude (requested by Jon)
**Date:** 2026-04-01
**Supersedes:** `docs/plans/2026-04-01-index-builder-completion-plan.md` (prior plan for the two-pane layout)
**Design brief:** `docs/plans/index-builder-design-brief.md`

---

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any locked item below needs to change, implementation must stop and this plan must be revised first.

---

## Manifest

### Platform API

No platform API endpoints are created or modified. The backend is complete. All existing pipeline routes are reused exactly as-is. See the prior completion plan for the full route inventory.

New platform API endpoints: `0`
Modified platform API endpoints: `0`

### Observability

No observability changes. Frontend-only plan.

### Database Migrations

No database migrations.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** `2`

| Page | File | Purpose |
|------|------|---------|
| `IndexBuilderListPage` | `web/src/pages/IndexBuilderListPage.tsx` | Full-page Index Jobs registry table with create action |
| `IndexBuilderJobPage` | `web/src/pages/IndexBuilderJobPage.tsx` | Single-page job detail: files + config + run + log + downloads |

**New hooks:** `2`

| Hook | File | Purpose |
|------|------|---------|
| `useIndexBuilderList` | `web/src/hooks/useIndexBuilderList.ts` | List loading, refresh, navigation to job detail |
| `useIndexBuilderJob` | `web/src/hooks/useIndexBuilderJob.ts` | Job detail orchestration: source set + job lifecycle + save/run/upload/download |

**New test files:** `2`

| Test | File | Purpose |
|------|------|---------|
| `IndexBuilderListPage.test` | `web/src/pages/IndexBuilderListPage.test.tsx` | List page rendering, navigation, empty state |
| `IndexBuilderJobPage.test` | `web/src/pages/IndexBuilderJobPage.test.tsx` | Job detail: files, config, run, progress, downloads, discard |

**Modified files:** `1`

| File | What changes |
|------|--------------|
| `web/src/router.tsx` | Replace single `index-builder` route with list route + `index-builder/:jobId` detail route + `index-builder/new` new-job route |

**Deleted files:** `3`

| File | Why |
|------|-----|
| `web/src/pages/IndexBuilderPage.tsx` | Replaced by `IndexBuilderListPage` + `IndexBuilderJobPage` |
| `web/src/hooks/useIndexBuilder.ts` | Replaced by `useIndexBuilderList` + `useIndexBuilderJob` |
| `web/src/pages/useIndexBuilderWorkbench.tsx` | Orphaned workbench variant, not imported anywhere |

**Preserved files (no modifications):** `10`

| File | Why preserved |
|------|--------------|
| `web/src/hooks/usePipelineSourceSet.ts` | Reused as-is by `useIndexBuilderJob` |
| `web/src/hooks/usePipelineJob.ts` | Reused as-is by `useIndexBuilderJob` |
| `web/src/components/pipelines/IndexJobsList.tsx` | Reused as-is in list page |
| `web/src/components/pipelines/IndexJobHeader.tsx` | Reused as-is in job detail page |
| `web/src/components/pipelines/IndexJobFilesTab.tsx` | Reused as-is as files section in job detail |
| `web/src/components/pipelines/IndexJobConfigTab.tsx` | Reused as-is as config section in job detail |
| `web/src/components/pipelines/IndexJobRunsTab.tsx` | Reused as-is as progress section in job detail |
| `web/src/components/pipelines/IndexJobArtifactsTab.tsx` | Reused as-is as downloads section in job detail |
| `web/src/components/pipelines/IndexJobStatusChip.tsx` | Reused in both pages |
| `web/src/lib/indexJobStatus.ts` | Reused in both hooks |

---

## Frozen Seam Contract

### What is being replaced

The current single route at `/app/pipeline-services/index-builder` mounts `IndexBuilderPage.tsx` — a two-pane layout where the right pane is a job list and the left pane is the selected job's detail. The orchestrator hook `useIndexBuilder.ts` manages both list and detail state in one hook.

### What replaces it

Two routes:
- `/app/pipeline-services/index-builder` → `IndexBuilderListPage` (the jobs registry)
- `/app/pipeline-services/index-builder/new` → `IndexBuilderJobPage` (new job)
- `/app/pipeline-services/index-builder/:jobId` → `IndexBuilderJobPage` (existing job)

### Compatibility rules

1. The `PipelineServicesPage` catalog links to `/app/pipeline-services/index-builder`. This continues to work — it now loads the list page instead of the two-pane page.
2. No other code in the application imports `IndexBuilderPage`, `useIndexBuilder`, or `useIndexBuilderWorkbench`.
3. The sub-hooks `usePipelineSourceSet` and `usePipelineJob` are shared infrastructure. They are NOT modified.
4. All 7 `IndexJob*` components are reused as-is. They are NOT modified.
5. All 3 service modules (`pipelineService.ts`, `pipelineSourceSetService.ts`, `indexJobStatus.ts`) are NOT modified.

### What must NOT happen

- Do not modify `usePipelineSourceSet.ts` or `usePipelineJob.ts` — they are shared infrastructure
- Do not modify any `IndexJob*` component — they are reused by composition
- Do not create new backend endpoints
- Do not introduce a `skipAutoSelect` parameter (the prior plan's approach) — the two-page architecture eliminates the auto-select problem entirely because the detail page only loads a source set when it mounts with a specific `jobId`

---

## Locked Product Decisions

1. The design authority is `docs/plans/index-builder-design-brief.md` and the two reference mockups provided by the user.
2. **Index Jobs is the top-level page.** It is a full-page table, not a sidebar. The user navigates into a job and back.
3. **Inside a job is one continuous surface.** No tabs. File upload, file table, config, run button, progress log, and download buttons are all on one scrollable page.
4. **File table has checkboxes** — checked = included in the next run. One table, not two sections.
5. **Config is displayed alongside file selection**, not on a separate tab.
6. **Progress is log-style**, showing every backend step chronologically. The existing 9-stage tracker component is reused as-is for now — converting to a true log stream is a future iteration.
7. **Download buttons are always visible**, disabled until a run completes successfully.
8. **Navigation:** List page → click job row → job detail page. Detail page → back button/link → list page. "Create New Job" → new job detail page.
9. Config tab remains read-only (backend chunking is hardcoded).
10. No run cancellation (no backend endpoint).
11. The `useIndexBuilder` two-pane orchestrator is deleted, not modified. Each page gets its own focused hook.

---

## Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. `/app/pipeline-services/index-builder` renders a full-page table of Index Jobs with columns: Name, Status, Last Run, Updated.
2. "Create New Job" on the list page navigates to `/app/pipeline-services/index-builder/new`.
3. Clicking a job row navigates to `/app/pipeline-services/index-builder/:jobId`.
4. The job detail page shows: editable name, status chip, metadata timestamps, file drop zone, uploaded files table with checkboxes, config section, "Run" button, progress area, and two download buttons.
5. File drop zone accepts `.md`/`.markdown` uploads. Uploaded files appear in the table with checkboxes.
6. Checking/unchecking files marks the job as having unsaved changes.
7. "Run" triggers the pipeline. The progress area shows the 9-stage tracker. Download buttons remain disabled until completion.
8. When the run completes, download buttons activate. The user can download both artifacts.
9. Navigating back to the list shows the job's status updated to Complete.
10. Creating a new job (via `/new`) starts with an empty state — "Untitled index job" name, empty file list, draft status.
11. Discarding a new unsaved job navigates back to the list.
12. All existing pipeline backend tests continue to pass.
13. New frontend tests pass for both pages.
14. TypeScript compiles: `cd web && npx tsc --noEmit` produces no errors.

---

## Locked Inventory Counts

### Backend
- New/modified backend files: `0`
- New migrations: `0`
- New endpoints: `0`

### Frontend
- New pages: `2`
- New hooks: `2`
- New test files: `2`
- Modified files: `1` (router.tsx)
- Deleted files: `3`
- Preserved files (no modifications): `10`

---

## Locked File Inventory

### New files

- `web/src/pages/IndexBuilderListPage.tsx`
- `web/src/pages/IndexBuilderJobPage.tsx`
- `web/src/hooks/useIndexBuilderList.ts`
- `web/src/hooks/useIndexBuilderJob.ts`
- `web/src/pages/IndexBuilderListPage.test.tsx`
- `web/src/pages/IndexBuilderJobPage.test.tsx`

### Modified files

- `web/src/router.tsx`

### Deleted files

- `web/src/pages/IndexBuilderPage.tsx`
- `web/src/hooks/useIndexBuilder.ts`
- `web/src/pages/useIndexBuilderWorkbench.tsx`

### Deleted test files

- `web/src/pages/IndexBuilderPage.test.tsx`

---

## Explicit Risks Accepted In This Plan

1. **Progress area reuses the 9-stage tracker, not a true log stream.** The existing `IndexJobRunsTab` component renders the 9 stages with status colors. Converting to a real-time log stream would require backend changes (streaming endpoint or websocket). The 9-stage tracker is reused as-is. A future plan can replace it with a log-style output.
2. **Config is read-only.** The `IndexJobConfigTab` stub is reused as-is alongside the files section. Making config editable requires backend support.
3. **Run history is not surfaced in this plan.** The detail page shows the latest run only. A proper run history (showing past runs with their file selections and artifacts) requires either a new backend list endpoint or client-side accumulation. Deferred.
4. **No delete action.** No `DELETE` endpoint exists for source sets.
5. **The `usePipelineSourceSet` auto-select-on-mount issue is sidestepped, not fixed.** The two-page architecture eliminates the problem because the detail page always mounts with a known `jobId` — there is no "empty selection" state that conflicts with auto-select. The list page does not use `usePipelineSourceSet` at all.
6. **The `'Release corpus'` default label in `usePipelineSourceSet` is not fixed.** The detail page explicitly sets the label on mount, overriding the default. This is a cosmetic issue that doesn't surface in the two-page architecture.

---

## Tasks

### Task 1: Create useIndexBuilderList hook

**File(s):** `web/src/hooks/useIndexBuilderList.ts`

**Step 1:** Create the hook. It manages the Index Jobs list for the list page:
```typescript
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectFocus } from './useProjectFocus';
import { useResolvedPipelineService } from '@/pages/usePipelineServicesOverview';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { listPipelineSourceSets } from '@/lib/pipelineSourceSetService';
import { deriveIndexJobStatus, type IndexJobViewModel } from '@/lib/indexJobStatus';

export function useIndexBuilderList() {
  const { resolvedProjectId } = useProjectFocus();
  const { service } = useResolvedPipelineService('index-builder');
  const pipelineKind = service?.pipelineKind ?? null;
  const navigate = useNavigate();

  useShellHeaderTitle({
    breadcrumbs: ['Pipeline Services', service?.label ?? 'Index Builder'],
  });

  const [indexJobs, setIndexJobs] = useState<IndexJobViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    if (!resolvedProjectId || !pipelineKind) {
      setIndexJobs([]);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const items = await listPipelineSourceSets({
        projectId: resolvedProjectId,
        pipelineKind,
      });
      setIndexJobs(
        items.map((item): IndexJobViewModel => ({
          id: item.source_set_id,
          name: item.label,
          status: deriveIndexJobStatus(
            { source_set_id: item.source_set_id, member_count: item.member_count },
            item.latest_job,
            false,
          ),
          memberCount: item.member_count,
          totalBytes: item.total_bytes,
          createdAt: item.created_at ?? null,
          updatedAt: item.updated_at ?? null,
          lastRunAt: item.latest_job?.started_at ?? null,
          latestJob: item.latest_job,
        })),
      );
    } catch {
      setIndexJobs([]);
      setError('Unable to load index jobs.');
    } finally {
      setIsLoading(false);
    }
  }, [resolvedProjectId, pipelineKind]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const navigateToJob = useCallback((jobId: string) => {
    navigate(`/app/pipeline-services/index-builder/${jobId}`);
  }, [navigate]);

  const navigateToNewJob = useCallback(() => {
    navigate('/app/pipeline-services/index-builder/new');
  }, [navigate]);

  return {
    indexJobs,
    isLoading,
    error,
    refreshList,
    navigateToJob,
    navigateToNewJob,
    resolvedProjectId,
  };
}
```

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors.

**Commit:** `feat: add useIndexBuilderList hook for jobs registry page`

---

### Task 2: Create useIndexBuilderJob hook

**File(s):** `web/src/hooks/useIndexBuilderJob.ts`

**Step 1:** Create the hook. It manages the detail page for a single job. Composes `usePipelineSourceSet` and `usePipelineJob`:
```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectFocus } from './useProjectFocus';
import { useResolvedPipelineService } from '@/pages/usePipelineServicesOverview';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { usePipelineSourceSet } from './usePipelineSourceSet';
import { usePipelineJob } from './usePipelineJob';
import {
  uploadPipelineSource,
  downloadPipelineDeliverable,
  type PipelineDeliverable,
} from '@/lib/pipelineService';
import { deriveIndexJobStatus, type IndexJobStatus } from '@/lib/indexJobStatus';

export function useIndexBuilderJob(jobId: string | null) {
  const isNewJob = jobId === 'new';
  const { resolvedProjectId } = useProjectFocus();
  const { service } = useResolvedPipelineService('index-builder');
  const pipelineKind = service?.pipelineKind ?? null;
  const navigate = useNavigate();

  useShellHeaderTitle({
    breadcrumbs: ['Pipeline Services', service?.label ?? 'Index Builder'],
  });

  const pipelineSourceSet = usePipelineSourceSet({
    projectId: resolvedProjectId,
    pipelineKind,
  });

  const pipelineJob = usePipelineJob({
    pipelineKind,
    sourceSetId: pipelineSourceSet.activeSourceSetId,
  });

  const [jobName, setJobName] = useState('Untitled index job');
  const [savedName, setSavedName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNewJob);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingKind, setDownloadingKind] = useState<string | null>(null);

  // Load existing job on mount
  useEffect(() => {
    if (isNewJob || !jobId || !pipelineKind) {
      setIsLoading(false);
      if (isNewJob) {
        pipelineSourceSet.resetSelection();
        pipelineSourceSet.setSourceSetLabel('Untitled index job');
        setHasUnsavedChanges(true);
      }
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);
        const detail = await pipelineSourceSet.loadSourceSet(jobId!);
        if (!cancelled && detail) {
          setJobName(detail.label);
          setSavedName(detail.label);
          setHasUnsavedChanges(false);
        }
        await pipelineJob.refreshLatestJob(jobId);
      } catch {
        if (!cancelled) setLoadError('Unable to load this job.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [jobId, pipelineKind]);

  // Derive status
  const status: IndexJobStatus = deriveIndexJobStatus(
    isNewJob
      ? { source_set_id: null, member_count: pipelineSourceSet.selectedSourceUids.length }
      : { source_set_id: jobId, member_count: pipelineSourceSet.selectedSourceUids.length },
    pipelineJob.job ? { status: pipelineJob.job.status } : null,
    hasUnsavedChanges,
  );

  const updateName = useCallback((name: string) => {
    setJobName(name);
    setHasUnsavedChanges(true);
  }, []);

  const saveDraft = useCallback(async () => {
    const label = jobName.trim() || 'Untitled index job';
    pipelineSourceSet.setSourceSetLabel(label);
    const saved = await pipelineSourceSet.persistSourceSet();
    setSavedName(label);
    setHasUnsavedChanges(false);
    if (isNewJob) {
      navigate(`/app/pipeline-services/index-builder/${saved.source_set_id}`, { replace: true });
    }
  }, [jobName, pipelineSourceSet, isNewJob, navigate]);

  const startRun = useCallback(async () => {
    if (hasUnsavedChanges || isNewJob) {
      const label = jobName.trim() || 'Untitled index job';
      pipelineSourceSet.setSourceSetLabel(label);
      const saved = await pipelineSourceSet.persistSourceSet();
      setSavedName(label);
      setHasUnsavedChanges(false);
      if (isNewJob) {
        navigate(`/app/pipeline-services/index-builder/${saved.source_set_id}`, { replace: true });
      }
      await pipelineJob.triggerJob(saved.source_set_id);
    } else {
      await pipelineJob.triggerJob();
    }
  }, [hasUnsavedChanges, isNewJob, jobName, pipelineSourceSet, pipelineJob, navigate]);

  const retryRun = useCallback(async () => {
    await pipelineJob.triggerJob();
  }, [pipelineJob]);

  const handleUpload = useCallback(async (files: File[]) => {
    if (!resolvedProjectId || !service) return;
    for (const file of files) {
      await uploadPipelineSource({
        projectId: resolvedProjectId,
        serviceSlug: service.slug,
        file,
      });
    }
    await pipelineSourceSet.refreshSources();
    setHasUnsavedChanges(true);
  }, [resolvedProjectId, service, pipelineSourceSet]);

  const handleDownload = useCallback(async (deliverable: PipelineDeliverable) => {
    if (!pipelineJob.job) return;
    try {
      setDownloadingKind(deliverable.deliverable_kind);
      setDownloadError(null);
      const blob = await downloadPipelineDeliverable({
        jobId: pipelineJob.job.job_id,
        deliverableKind: deliverable.deliverable_kind,
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = deliverable.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Download failed.');
    } finally {
      setDownloadingKind(null);
    }
  }, [pipelineJob.job]);

  const discardChanges = useCallback(() => {
    if (isNewJob) {
      navigate('/app/pipeline-services/index-builder');
    } else {
      setJobName(savedName);
      setHasUnsavedChanges(false);
    }
  }, [isNewJob, savedName, navigate]);

  const navigateBack = useCallback(() => {
    navigate('/app/pipeline-services/index-builder');
  }, [navigate]);

  return {
    // State
    jobName,
    status,
    hasUnsavedChanges,
    isNewJob,
    isLoading,
    loadError,
    downloadError,
    downloadingKind,

    // Actions
    updateName,
    saveDraft,
    startRun,
    retryRun,
    handleUpload,
    handleDownload,
    discardChanges,
    navigateBack,

    // Composed state (pass-through)
    pipelineSourceSet,
    pipelineJob,
    service,
    resolvedProjectId,
  };
}
```

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors.

**Commit:** `feat: add useIndexBuilderJob hook for job detail page`

---

### Task 3: Create IndexBuilderListPage

**File(s):** `web/src/pages/IndexBuilderListPage.tsx`

**Step 1:** Create the list page. It reuses `IndexJobsList` for the table:
```typescript
import { useIndexBuilderList } from '@/hooks/useIndexBuilderList';
import { IndexJobsList } from '@/components/pipelines/IndexJobsList';

export default function IndexBuilderListPage() {
  const list = useIndexBuilderList();

  return (
    <div className="flex h-full flex-col p-4">
      <IndexJobsList
        jobs={list.indexJobs}
        selectedJobId={null}
        onSelectJob={list.navigateToJob}
        onNewJob={list.navigateToNewJob}
      />
    </div>
  );
}
```

Note: `IndexJobsList` already renders the table header ("Index Jobs"), "New Index Job" button, status chips, sort logic, and empty state. The list page is a thin wrapper that provides the data and navigation callbacks.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors.

**Commit:** `feat: add IndexBuilderListPage as full-page jobs registry`

---

### Task 4: Create IndexBuilderJobPage

**File(s):** `web/src/pages/IndexBuilderJobPage.tsx`

**Step 1:** Create the job detail page. It composes the existing components into one scrollable surface:
```typescript
import { useParams } from 'react-router-dom';
import { useIndexBuilderJob } from '@/hooks/useIndexBuilderJob';
import { IndexJobHeader } from '@/components/pipelines/IndexJobHeader';
import { IndexJobFilesTab } from '@/components/pipelines/IndexJobFilesTab';
import { IndexJobConfigTab } from '@/components/pipelines/IndexJobConfigTab';
import { IndexJobRunsTab } from '@/components/pipelines/IndexJobRunsTab';
import { IndexJobArtifactsTab } from '@/components/pipelines/IndexJobArtifactsTab';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { IconArrowLeft } from '@tabler/icons-react';

export default function IndexBuilderJobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const job = useIndexBuilderJob(jobId ?? 'new');

  if (job.isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (job.loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <p className="text-sm text-destructive">{job.loadError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={job.navigateBack}>
          Back to Index Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Back navigation */}
      <div className="border-b border-border px-4 py-2">
        <button
          type="button"
          onClick={job.navigateBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft size={14} />
          Index Jobs
        </button>
      </div>

      {/* Job header: name, status, metadata, CTAs */}
      <IndexJobHeader
        name={job.jobName}
        status={job.status}
        hasUnsavedChanges={job.hasUnsavedChanges}
        createdAt={null}
        updatedAt={null}
        lastRunAt={job.pipelineJob.job?.started_at ?? null}
        memberCount={job.pipelineSourceSet.selectedSourceUids.length}
        onNameChange={job.updateName}
        onSaveDraft={() => { void job.saveDraft(); }}
        onStartRun={() => { void job.startRun(); }}
        onRetryRun={() => { void job.retryRun(); }}
        onDiscard={job.discardChanges}
        isSaving={job.pipelineSourceSet.isPersisting}
        isTriggering={job.pipelineJob.isTriggering}
      />

      {/* Single continuous surface: files + config side by side */}
      <div className="flex flex-col gap-6 px-4 py-4">
        <div className="flex gap-4">
          {/* Files section (takes more space) */}
          <div className="min-w-0 flex-[2]">
            <IndexJobFilesTab
              sources={job.pipelineSourceSet.sources}
              selectedSourceUids={job.pipelineSourceSet.selectedSourceUids}
              sourcesLoading={job.pipelineSourceSet.sourcesLoading}
              sourcesError={job.pipelineSourceSet.sourcesError}
              onToggleSource={(uid) => {
                job.pipelineSourceSet.toggleSource(uid);
                // Mark unsaved after toggling — cannot be in the hook
                // because toggleSource is in usePipelineSourceSet
              }}
              onUpload={job.handleUpload}
              onRemoveSource={job.pipelineSourceSet.removeSource}
            />
          </div>

          {/* Config section (narrower) */}
          <div className="min-w-0 flex-1">
            <IndexJobConfigTab />
          </div>
        </div>

        {/* Progress / log area */}
        <div>
          <IndexJobRunsTab
            job={job.pipelineJob.job}
            isPolling={job.pipelineJob.isPolling}
            jobLoading={job.pipelineJob.jobLoading}
            jobError={job.pipelineJob.jobError}
          />
        </div>

        {/* Download buttons — always visible */}
        <div>
          <IndexJobArtifactsTab
            job={job.pipelineJob.job}
            onDownload={job.handleDownload}
            downloadError={job.downloadError}
            downloadingKind={job.downloadingKind}
          />
        </div>
      </div>
    </div>
  );
}
```

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors.

**Commit:** `feat: add IndexBuilderJobPage as single-surface job detail`

---

### Task 5: Update router

**File(s):** `web/src/router.tsx`

**Step 1:** Replace the IndexBuilderPage import with the two new page imports:
```typescript
// Remove:
import IndexBuilderPage from '@/pages/IndexBuilderPage';

// Add:
import IndexBuilderListPage from '@/pages/IndexBuilderListPage';
import IndexBuilderJobPage from '@/pages/IndexBuilderJobPage';
```

**Step 2:** Replace the single route with three routes:
```typescript
// Remove:
{ path: '/app/pipeline-services/index-builder', element: <IndexBuilderPage /> },

// Add:
{ path: '/app/pipeline-services/index-builder', element: <IndexBuilderListPage /> },
{ path: '/app/pipeline-services/index-builder/new', element: <IndexBuilderJobPage /> },
{ path: '/app/pipeline-services/index-builder/:jobId', element: <IndexBuilderJobPage /> },
```

The `/new` route must come before `/:jobId` to avoid matching "new" as a jobId.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors.

**Commit:** `feat: add two-page routes for index builder list and job detail`

---

### Task 6: Delete old files

**Step 1:** Delete `web/src/pages/IndexBuilderPage.tsx`
**Step 2:** Delete `web/src/hooks/useIndexBuilder.ts`
**Step 3:** Delete `web/src/pages/useIndexBuilderWorkbench.tsx`
**Step 4:** Delete `web/src/pages/IndexBuilderPage.test.tsx`

**Step 5:** Verify no imports reference the deleted files:
```bash
grep -r "IndexBuilderPage\|useIndexBuilder\b\|useIndexBuilderWorkbench" web/src/ --include="*.ts" --include="*.tsx"
```
Expected: only hits in the new files and router, none referencing the old paths.

**Test command:** `cd web && npx tsc --noEmit`
**Expected output:** No errors.

**Commit:** `chore: delete old two-pane IndexBuilderPage, useIndexBuilder, and workbench hook`

---

### Task 7: Write list page tests

**File(s):** `web/src/pages/IndexBuilderListPage.test.tsx`

**Step 1:** Set up mocks for `useIndexBuilderList` and render helpers.

**Step 2:** Write tests:
1. "renders empty state when no jobs exist" — verify "No index jobs yet." text
2. "renders job rows with name, status, and timestamps" — mock 3 jobs, verify all appear
3. "clicking a job row calls navigateToJob" — click a row, verify callback
4. "clicking New Index Job calls navigateToNewJob" — click button, verify callback

**Test command:** `cd web && npx vitest run src/pages/IndexBuilderListPage.test.tsx`
**Expected output:** 4 tests pass.

**Commit:** `test: add IndexBuilderListPage tests`

---

### Task 8: Write job detail page tests

**File(s):** `web/src/pages/IndexBuilderJobPage.test.tsx`

**Step 1:** Set up mocks for `useIndexBuilderJob` and render helpers.

**Step 2:** Write tests:
1. "shows loading skeleton while job loads" — mock isLoading=true
2. "shows error state when load fails" — mock loadError
3. "renders job header with name and status" — mock loaded job
4. "renders file upload section and config side by side" — verify both present
5. "renders progress area with stage tracker" — mock a running job
6. "renders download buttons disabled when no completed run" — verify disabled state
7. "renders download buttons enabled when run complete" — mock complete job with deliverables
8. "discard on new job navigates back to list" — mock isNewJob, click discard

**Test command:** `cd web && npx vitest run src/pages/IndexBuilderJobPage.test.tsx`
**Expected output:** 8 tests pass.

**Commit:** `test: add IndexBuilderJobPage tests`

---

### Task 9: Final verification

**Step 1:** Run all tests: `cd web && npx vitest run src/pages/IndexBuilderListPage.test.tsx src/pages/IndexBuilderJobPage.test.tsx src/lib/indexJobStatus.test.ts`
**Step 2:** Run TypeScript: `cd web && npx tsc --noEmit`
**Step 3:** Verify deleted files don't exist
**Step 4:** Verify no orphan imports reference deleted files
**Step 5:** Walk through acceptance contract items 1-14

**Commit:** No commit — verification only.

---

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked acceptance contract (14 items) passes end-to-end.
2. The locked file inventory matches the actual set of created, modified, and deleted files.
3. The locked inventory counts match reality.
4. No import references `IndexBuilderPage`, `useIndexBuilder`, or `useIndexBuilderWorkbench`.
5. All 7 `IndexJob*` components and both sub-hooks are unmodified.
6. All 3 service modules are unmodified.
7. TypeScript compiles without errors.
8. All new tests pass.
9. The `indexJobStatus.test.ts` tests continue to pass.
