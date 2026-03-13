# Project Assets Upload Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Project Assets page upload files reliably and display them in the table. Eliminate Uppy from the Assets upload path.

**Architecture:** Replace the Uppy-based uploader with a simple hook that POSTs each file to the existing `ingest` edge function via `edgeFetch` + `FormData`. Keep the ingest edge function as-is (it handles storage upload, content hashing, DB insert, validation). Fix the idempotency bug where re-uploading identical bytes to a different project silently fails to update `project_id`.

**Tech Stack:** React, Supabase edge functions (Deno), Ark UI FileUpload (dropzone only), `edgeFetch` (existing auth wrapper)

---

## Data Flow (After Fix)

```
User drops files → Ark UI FileUpload.Dropzone → onFileChange → files[] stored in React state
User clicks Upload →
  for each file:
    const form = new FormData()
    form.append('file', file)
    form.append('project_id', projectId)
    form.append('ingest_mode', 'upload_only')
    const resp = await edgeFetch('ingest', { method: 'POST', body: form })
                          ↓
                 ingest edge function (unchanged except idempotency fix)
                   ├── sha256 → source_uid
                   ├── checkIdempotency → update project_id if different
                   ├── uploadToStorage → documents bucket
                   └── INSERT source_documents
                          ↓
  all done → loadDocs(projectId) → table refreshes
```

No Uppy. No instance lifecycle. No ghost files. Just `fetch`.

## Files Overview

| File | Change |
|------|--------|
| `supabase/functions/ingest/validate.ts` | Return `currentProjectId` from idempotency check |
| `supabase/functions/ingest/index.ts` | Update `project_id` on idempotent re-upload |
| `web/src/hooks/useDirectUpload.ts` | **Create** — simple upload hook using `edgeFetch` |
| `web/src/pages/ProjectAssetsPage.tsx` | Replace `ProjectParseUppyUploader` with Ark dropzone + `useDirectUpload` |

**Not modified:** `useUppyTransport.ts`, `ProjectParseUppyUploader.tsx` — these stay for ELT pages and cloud import. Assets just stops using them.

---

## Task 1: Fix ingest idempotency to update `project_id`

**Problem:** `checkIdempotency` returns `"return_existing"` with HTTP 200 when identical bytes are re-uploaded. The `project_id` column is never updated to the caller's target project. Files appear to upload (200) but don't show in the target project's table.

**Files:**
- Modify: `supabase/functions/ingest/validate.ts:24-83`
- Modify: `supabase/functions/ingest/index.ts:60-64`

### Step 1: Update `IdempotencyResult` type

In `supabase/functions/ingest/validate.ts`, change the type at lines 24-27:

```typescript
export type IdempotencyResult =
  | { action: "return_existing"; response: IngestResponse; currentProjectId: string | null }
  | { action: "retry"; previousProjectId: string | null }
  | { action: "proceed" };
```

### Step 2: Return `currentProjectId` from the existing branch

In `supabase/functions/ingest/validate.ts`, change the return at lines 75-83:

```typescript
  return {
    action: "return_existing",
    response: {
      source_uid: sourceUid,
      conv_uid: existingConv?.conv_uid ?? null,
      status: existing.status ?? "uploaded",
      error: existing.error ?? undefined,
    },
    currentProjectId: existing.project_id ?? null,
  };
```

### Step 3: Update `index.ts` to reassign project on idempotent hit

In `supabase/functions/ingest/index.ts`, replace lines 60-64:

FROM:
```typescript
    // Idempotency check + retry handling (Gap 4: preserves previous project_id).
    const idem = await checkIdempotency(supabaseAdmin, source_uid, ownerId);
    if (idem.action === "return_existing") {
      return json(200, idem.response);
    }
```

TO:
```typescript
    // Idempotency check + retry handling (Gap 4: preserves previous project_id).
    const idem = await checkIdempotency(supabaseAdmin, source_uid, ownerId);
    if (idem.action === "return_existing") {
      // Re-assign to target project if caller specified a different one.
      if (project_id && project_id !== idem.currentProjectId) {
        const { error: moveErr } = await supabaseAdmin
          .from("source_documents")
          .update({ project_id, updated_at: new Date().toISOString() })
          .eq("source_uid", source_uid);
        if (moveErr) throw new Error(`Failed to reassign document to project: ${moveErr.message}`);
      }
      return json(200, idem.response);
    }
```

### Step 4: Deploy

```bash
supabase functions deploy ingest
```

### Step 5: Commit

```bash
git add supabase/functions/ingest/validate.ts supabase/functions/ingest/index.ts
git commit -m "fix(ingest): update project_id on idempotent re-upload"
```

---

## Task 2: Create `useDirectUpload` hook

**Purpose:** Replace Uppy with a minimal hook that uploads files via `edgeFetch('ingest', ...)`. Tracks per-file progress using `XMLHttpRequest` (the only browser API that supports upload progress — `fetch` doesn't).

**Files:**
- Create: `web/src/hooks/useDirectUpload.ts`

### Step 1: Write the hook

```typescript
import { useCallback, useRef, useState } from 'react';
import { requireAccessToken } from '@/lib/edge';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type IngestResponse = {
  source_uid?: string;
  status?: string;
  error?: string;
};

export type StagedFile = {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
};

export type UploadStatus = 'idle' | 'uploading' | 'done';

function ingestUrl(): string {
  return `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/ingest`;
}

function uploadOneFile(
  file: File,
  projectId: string,
  token: string,
  onProgress: (pct: number) => void,
): Promise<IngestResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', ingestUrl());
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', ANON_KEY);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as IngestResponse;
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(body.error ?? `HTTP ${xhr.status}`));
      } catch {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText.slice(0, 200)}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.onabort = () => reject(new Error('Upload aborted'));

    const form = new FormData();
    form.append('file', file);
    form.append('project_id', projectId);
    form.append('ingest_mode', 'upload_only');
    xhr.send(form);
  });
}

export function useDirectUpload(projectId: string) {
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const abortRef = useRef(false);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.file.name}:${f.file.size}`));
      const newFiles = incoming
        .filter((f) => !existing.has(`${f.name}:${f.size}`))
        .map((f) => ({
          id: `${f.name}-${f.size}-${Date.now()}`,
          file: f,
          status: 'pending' as const,
          progress: 0,
        }));
      return [...prev, ...newFiles];
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearDone = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== 'done'));
    setUploadStatus('idle');
  }, []);

  const startUpload = useCallback(async (): Promise<string[]> => {
    abortRef.current = false;
    setUploadStatus('uploading');

    const token = await requireAccessToken();
    const sourceUids: string[] = [];

    const pending = files.filter((f) => f.status === 'pending');
    for (const staged of pending) {
      if (abortRef.current) break;

      setFiles((prev) =>
        prev.map((f) => (f.id === staged.id ? { ...f, status: 'uploading' as const, progress: 0 } : f)),
      );

      try {
        const resp = await uploadOneFile(staged.file, projectId, token, (pct) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === staged.id ? { ...f, progress: pct } : f)),
          );
        });
        if (resp.source_uid) sourceUids.push(resp.source_uid);
        setFiles((prev) =>
          prev.map((f) => (f.id === staged.id ? { ...f, status: 'done' as const, progress: 100 } : f)),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === staged.id
              ? { ...f, status: 'error' as const, error: err instanceof Error ? err.message : String(err) }
              : f,
          ),
        );
      }
    }

    setUploadStatus('done');
    return sourceUids;
  }, [files, projectId]);

  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return { files, uploadStatus, pendingCount, addFiles, removeFile, clearDone, startUpload };
}
```

### Step 2: Verify TypeScript compiles

```bash
cd web && npx tsc --noEmit
```

### Step 3: Commit

```bash
git add web/src/hooks/useDirectUpload.ts
git commit -m "feat: add useDirectUpload hook — uploads to ingest via XHR without Uppy"
```

---

## Task 3: Rewrite `ProjectAssetsPage` to use `useDirectUpload`

**Purpose:** Replace `ProjectParseUppyUploader` with an Ark UI dropzone + the new `useDirectUpload` hook. Same three-column layout: dropzone left, table center, actions right.

**Files:**
- Modify: `web/src/pages/ProjectAssetsPage.tsx`

### Step 1: Full rewrite of ProjectAssetsPage.tsx

```tsx
import { useCallback, useEffect, useState } from 'react';
import { FileUpload } from '@ark-ui/react/file-upload';
import {
  IconLoader2,
  IconTrash,
  IconDownload,
  IconEye,
  IconUpload,
  IconFile,
  IconX,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
import {
  type ProjectDocumentRow,
  getDocumentFormat,
  formatBytes,
} from '@/lib/projectDetailHelpers';
import { useDirectUpload, type StagedFile } from '@/hooks/useDirectUpload';
import { cn } from '@/lib/utils';

function StatusBadge({ status }: { status: ProjectDocumentRow['status'] }) {
  const variant =
    status === 'ingested'
      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
      : status === 'conversion_failed' || status === 'ingest_failed'
        ? 'bg-destructive/10 text-destructive'
        : status === 'converting'
          ? 'bg-primary/10 text-primary'
          : 'bg-muted/60 text-muted-foreground';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${variant}`}>
      {status}
    </span>
  );
}

function FileStatusIcon({ status }: { status: StagedFile['status'] }) {
  switch (status) {
    case 'uploading':
      return <IconLoader2 size={14} className="animate-spin text-primary" />;
    case 'done':
      return <IconCheck size={14} className="text-green-500" />;
    case 'error':
      return <IconAlertCircle size={14} className="text-destructive" />;
    default:
      return null;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectAssetsPage() {
  useShellHeaderTitle({ title: 'Project Assets' });

  const { resolvedProjectId, resolvedProjectName } = useProjectFocus();

  // --- Table state ---
  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // --- Upload state ---
  const {
    files: stagedFiles,
    uploadStatus,
    pendingCount,
    addFiles,
    removeFile,
    clearDone,
    startUpload,
  } = useDirectUpload(resolvedProjectId ?? '');

  const loadDocs = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAllProjectDocuments<ProjectDocumentRow>({
        projectId,
        select: '*',
      });
      setDocs(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!resolvedProjectId) {
      setDocs([]);
      setSelected(new Set());
      return;
    }
    void loadDocs(resolvedProjectId);
  }, [resolvedProjectId, loadDocs]);

  // Refresh table after upload completes
  useEffect(() => {
    if (uploadStatus === 'done' && resolvedProjectId) {
      void loadDocs(resolvedProjectId);
    }
  }, [uploadStatus, resolvedProjectId, loadDocs]);

  const toggleSelect = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === docs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(docs.map((d) => d.source_uid)));
    }
  };

  const allSelected = docs.length > 0 && selected.size === docs.length;
  const someSelected = selected.size > 0 && selected.size < docs.length;

  if (!resolvedProjectId) {
    return (
      <div className="flex h-[calc(100vh-var(--app-shell-header-height))] items-center justify-center text-sm text-muted-foreground">
        Select a project to view assets.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] overflow-hidden p-6 gap-4">
      {/* Left: dropzone + staged files */}
      <div className="flex w-[280px] shrink-0 flex-col gap-2">
        <div className="text-sm font-bold text-foreground px-1">Add Documents</div>

        <FileUpload.Root
          maxFiles={25}
          onFileChange={(details) => addFiles(details.acceptedFiles)}
          className="flex flex-col gap-0"
        >
          <FileUpload.Dropzone
            className={cn(
              'flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-center',
              'cursor-pointer transition-colors duration-150',
              'hover:bg-muted/50',
              'data-dragging:border-primary data-dragging:border-solid data-dragging:bg-primary/5',
            )}
          >
            <IconUpload size={32} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Drag files here or click to browse
            </span>
          </FileUpload.Dropzone>
          <FileUpload.HiddenInput />
        </FileUpload.Root>

        {/* Upload button */}
        {pendingCount > 0 && uploadStatus !== 'uploading' && (
          <button
            type="button"
            onClick={() => void startUpload()}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Upload {pendingCount} file{pendingCount === 1 ? '' : 's'}
          </button>
        )}

        {/* Clear done button */}
        {uploadStatus === 'done' && stagedFiles.some((f) => f.status === 'done') && (
          <button
            type="button"
            onClick={clearDone}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Clear completed
          </button>
        )}

        {/* Staged file list */}
        {stagedFiles.length > 0 && (
          <div className="max-h-64 overflow-y-auto">
            <ul className="flex flex-col">
              {stagedFiles.map((sf) => (
                <li
                  key={sf.id}
                  className={cn(
                    'grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-border px-1 py-1.5',
                    sf.status === 'error' && 'bg-destructive/5',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <IconFile size={14} className="flex-none text-muted-foreground" />
                    <span className="truncate text-xs text-foreground">{sf.file.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatSize(sf.file.size)}
                  </span>
                  <FileStatusIcon status={sf.status} />
                  {sf.status !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => removeFile(sf.id)}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${sf.file.name}`}
                    >
                      <IconX size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Center: file table */}
      <section className="flex min-h-0 w-1/2 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <h2 className="text-sm font-medium text-foreground">
            {resolvedProjectName ?? 'Project Assets'}
          </h2>
          <span className="text-xs text-muted-foreground">
            {docs.length} file{docs.length === 1 ? '' : 's'}
          </span>
          {selected.size > 0 && (
            <span className="ml-auto text-xs text-primary font-medium">
              {selected.size} selected
            </span>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted/30 text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Format</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Parsed</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <IconLoader2 size={16} className="animate-spin" />
                      Loading files…
                    </div>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-destructive">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && docs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    No files in this project yet. Drag files to the left to upload.
                  </td>
                </tr>
              )}

              {!loading && !error && docs.map((doc) => (
                <tr
                  key={doc.source_uid}
                  className={cn(
                    'border-b border-border/60 transition-colors hover:bg-accent/30',
                    selected.has(doc.source_uid) && 'bg-accent/20',
                  )}
                >
                  <td className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(doc.source_uid)}
                      onChange={() => toggleSelect(doc.source_uid)}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block max-w-[300px] truncate text-foreground">
                      {doc.doc_title}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      {getDocumentFormat(doc)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatBytes(doc.source_filesize)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    {doc.status === 'ingested' ? (
                      <span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">Yes</span>
                    ) : doc.status === 'converting' ? (
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">In progress</span>
                    ) : doc.status === 'conversion_failed' || doc.status === 'ingest_failed' ? (
                      <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Failed</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>

        {docs.length > 0 && (
          <div className="flex items-center border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span>{docs.length} file{docs.length === 1 ? '' : 's'}</span>
          </div>
        )}
      </section>

      {/* Right: actions panel */}
      {selected.size > 0 && (
        <div className="flex w-[200px] shrink-0 flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Actions
          </h3>
          <span className="text-xs text-muted-foreground">
            {selected.size} file{selected.size === 1 ? '' : 's'} selected
          </span>
          <div className="mt-1 flex flex-col gap-1">
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <IconEye size={14} stroke={1.75} />
              Preview
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <IconDownload size={14} stroke={1.75} />
              Download
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <IconTrash size={14} stroke={1.75} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 2: Verify TypeScript compiles

```bash
cd web && npx tsc --noEmit
```

### Step 3: Manual test

1. Navigate to `/app/assets`, select a project
2. Drop 3+ files onto the dropzone → they appear in staged list
3. Click "Upload 3 files" → progress per file, then checkmarks
4. Table refreshes and shows all files
5. Upload the same files to a different project → files move, appear in new project

### Step 4: Commit

```bash
git add web/src/hooks/useDirectUpload.ts web/src/pages/ProjectAssetsPage.tsx
git commit -m "feat(assets): replace Uppy with direct upload via edgeFetch

Eliminates Uppy from the Assets upload path. Uses a simple useDirectUpload
hook that POSTs each file to the ingest edge function via XMLHttpRequest
for progress tracking. No instance lifecycle, no ghost files."
```

---

## Verification Checklist

1. `cd web && npx tsc --noEmit` — zero errors
2. `npm run dev` — no console errors
3. New project → upload 3 files → all appear in table with status "uploaded"
4. Same files → different project → files move to new project
5. `/app/docs` still works (uses Uppy via `ProjectParseUppyUploader` — unchanged)
6. `/app/elt/:projectId` still works (uses Uppy via `ProjectParseUppyUploader` — unchanged)