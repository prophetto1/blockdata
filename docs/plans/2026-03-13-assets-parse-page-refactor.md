# Assets & Parse Page Refactor — Compose Shared Components

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded `ProjectAssetsPage` and `ParsePage` with thin Workbench shells that compose the existing shared hooks and components.

**Architecture:** Each page becomes ~20 lines: a composition hook (`useAssetsWorkbench` / `useParseWorkbench`) that wires shared components together, and a page component that renders `<Workbench>` with it. Follows the exact pattern of `SuperuserLayout2.tsx` + `useWorkspaceEditor.tsx`. All document loading, selection, upload, parsing, preview, and actions use the existing shared layer — no inline reimplementations.

**Tech Stack:** React, Workbench component, useProjectDocuments, UploadTabPanel, DocumentFileTable, ParseTabPanel/useParseTab, PreviewTabPanel, StatusBadge

---

## Shared Components Reference

These already exist and must NOT be reimplemented:

| Component | Path | What it does |
|-----------|------|--------------|
| `useProjectDocuments` | `src/hooks/useProjectDocuments.ts` | Loads docs, realtime sync, selection state (toggle, selectAll, clear) |
| `UploadTabPanel` | `src/components/documents/UploadTabPanel.tsx` | Ark UI dropzone, staged files, upload button. Props: `projectId`, `onUploadComplete` |
| `DocumentFileTable` | `src/components/documents/DocumentFileTable.tsx` | Sortable table with checkboxes, status badges, row actions slot. Props: docs, selected, toggle, activeDoc, onDocClick, renderRowActions |
| `PreviewTabPanel` | `src/components/documents/PreviewTabPanel.tsx` | Full preview for PDF/image/text/md/docx/xlsx/pptx. Props: `{ doc }` |
| `StatusBadge` | `src/components/documents/StatusBadge.tsx` | Status pill. Already used by DocumentFileTable internally |
| `ParseTabPanel` | `src/components/documents/ParseTabPanel.tsx` | Parse toolbar + progress + JSON modal. Props: `{ docs, selected, parseTab }` |
| `useParseTab` | `src/components/documents/ParseTabPanel.tsx` | Profile loading, batch parse, JSON view/download |
| `ParseRowActions` | `src/components/documents/ParseTabPanel.tsx` | Per-row parse/view/download buttons |
| `Workbench` | `src/components/workbench/Workbench.tsx` | Multi-pane tab container with drag, resize, persistence |

## Key Pattern: SuperuserLayout2

```tsx
// Page component — ~20 lines
export function Component() {
  const { renderContent } = useMyWorkbench();
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={MY_TABS}
          defaultPanes={MY_DEFAULT_PANES}
          saveKey="my-workbench"
          renderContent={renderContent}
          hideToolbar
          maxColumns={3}
        />
      </div>
    </div>
  );
}
```

---

### Task 1: Create `useAssetsWorkbench.tsx`

**Files:**
- Create: `src/pages/useAssetsWorkbench.tsx`

**What this hook does:**
- Calls `useProjectDocuments(projectId)` for doc loading, selection, realtime
- Calls `useProjectFocus()` for project ID
- Manages `activeDocUid` state (which doc is selected for preview)
- Implements `handleDelete` (calls `supabase.rpc('delete_source_document')` + storage remove, then `refreshDocs`)
- Implements `handleDownload` (calls `resolveSignedUrlForLocators` + `downloadFromSignedUrl`)
- Returns `renderContent(tabId)` that renders:
  - `'upload'` → `<UploadTabPanel projectId={id} onUploadComplete={refreshDocs} />`
  - `'files'` → `<DocumentFileTable>` with all props from `useProjectDocuments`, plus `activeDoc={activeDocUid}`, `onDocClick` sets activeDocUid, `renderRowActions` for download/delete buttons
  - `'preview'` → `<PreviewTabPanel doc={selectedDoc} />`
- Exports `ASSETS_TABS` and `ASSETS_DEFAULT_PANES` constants

**Step 1: Write the hook**

```tsx
import { useCallback, useMemo, useState } from 'react';
import { IconUpload, IconFiles, IconEye, IconDownload, IconTrash } from '@tabler/icons-react';
import type { WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { UploadTabPanel } from '@/components/documents/UploadTabPanel';
import { DocumentFileTable } from '@/components/documents/DocumentFileTable';
import { PreviewTabPanel } from '@/components/documents/PreviewTabPanel';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { downloadFromSignedUrl, resolveSignedUrlForLocators } from '@/lib/projectDetailHelpers';
import { supabase } from '@/lib/supabase';

const DOCUMENTS_BUCKET = (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';

export const ASSETS_TABS: WorkbenchTab[] = [
  { id: 'upload', label: 'Upload', icon: IconUpload },
  { id: 'files', label: 'Files', icon: IconFiles },
  { id: 'preview', label: 'Preview', icon: IconEye },
];

export const ASSETS_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-upload', tabs: ['upload'], activeTab: 'upload', width: 20, minWidth: 16, maxWidth: 24, maxTabs: 1 },
  { id: 'pane-files', tabs: ['files'], activeTab: 'files', width: 30, minWidth: 22 },
  { id: 'pane-preview', tabs: ['preview'], activeTab: 'preview', width: 50 },
]);

export function useAssetsWorkbench() {
  useShellHeaderTitle({ title: 'Project Assets' });
  const { resolvedProjectId } = useProjectFocus();

  const docState = useProjectDocuments(resolvedProjectId);
  const { docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, selectedDocs, refreshDocs } = docState;

  const [activeDocUid, setActiveDocUid] = useState<string | null>(null);

  const activeDoc = useMemo(
    () => docs.find((d) => d.source_uid === activeDocUid) ?? null,
    [docs, activeDocUid],
  );

  const handleDocClick = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
  }, []);

  const handleDelete = useCallback(async (doc: ProjectDocumentRow) => {
    const { error: rpcError } = await supabase.rpc('delete_source_document', { p_source_uid: doc.source_uid });
    if (rpcError) return;
    const locator = doc.source_locator?.replace(/^\/+/, '');
    if (locator) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([locator]);
    }
    if (activeDocUid === doc.source_uid) setActiveDocUid(null);
    refreshDocs();
  }, [activeDocUid, refreshDocs]);

  const handleDownload = useCallback(async (doc: ProjectDocumentRow) => {
    const { url } = await resolveSignedUrlForLocators([doc.source_locator]);
    if (url) downloadFromSignedUrl(url, doc.doc_title);
  }, []);

  const renderRowActions = useCallback((doc: ProjectDocumentRow) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); void handleDownload(doc); }}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
        title="Download"
      >
        <IconDownload size={14} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); void handleDelete(doc); }}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Delete"
      >
        <IconTrash size={14} />
      </button>
    </div>
  ), [handleDownload, handleDelete]);

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'upload') {
      if (!resolvedProjectId) {
        return (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a project first.
          </div>
        );
      }
      return <UploadTabPanel projectId={resolvedProjectId} onUploadComplete={refreshDocs} />;
    }

    if (tabId === 'files') {
      return (
        <DocumentFileTable
          docs={docs}
          loading={loading}
          error={error}
          selected={selected}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          allSelected={allSelected}
          someSelected={someSelected}
          activeDoc={activeDocUid}
          onDocClick={handleDocClick}
          renderRowActions={renderRowActions}
        />
      );
    }

    if (tabId === 'preview') {
      return <PreviewTabPanel doc={activeDoc} />;
    }

    return null;
  }, [resolvedProjectId, docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, activeDocUid, activeDoc, handleDocClick, renderRowActions, refreshDocs]);

  return { renderContent };
}
```

**Step 2: Commit**

```bash
git add src/pages/useAssetsWorkbench.tsx
git commit -m "feat: create useAssetsWorkbench composition hook"
```

---

### Task 2: Rewrite `ProjectAssetsPage.tsx` as a thin shell

**Files:**
- Rewrite: `src/pages/ProjectAssetsPage.tsx`

**Step 1: Replace the entire file**

```tsx
import { Workbench } from '@/components/workbench/Workbench';
import { useAssetsWorkbench, ASSETS_TABS, ASSETS_DEFAULT_PANES } from './useAssetsWorkbench';

export default function ProjectAssetsPage() {
  const { renderContent } = useAssetsWorkbench();
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={ASSETS_TABS}
          defaultPanes={ASSETS_DEFAULT_PANES}
          saveKey="project-assets"
          renderContent={renderContent}
          hideToolbar
          maxColumns={3}
        />
      </div>
    </div>
  );
}
```

**Step 2: Verify the app compiles**

Run: `cd web && npx tsc --noEmit`
Expected: No errors (or pre-existing errors only)

**Step 3: Commit**

```bash
git add src/pages/ProjectAssetsPage.tsx
git commit -m "refactor: ProjectAssetsPage composes shared components via Workbench"
```

---

### Task 3: Create `useParseWorkbench.tsx`

**Files:**
- Create: `src/pages/useParseWorkbench.tsx`

**What this hook does:**
- Calls `useProjectDocuments(projectId)` for doc loading, selection, realtime
- Calls `useProjectFocus()` for project ID
- Calls `useParseTab()` for profile loading, batch parse, JSON view/download
- Manages `activeDocUid` state for preview selection
- Implements `handleReset` (calls `supabase.rpc('reset_source_document')`, then `refreshDocs`)
- Returns `renderContent(tabId)` that renders:
  - `'parse'` → `<ParseTabPanel docs={docs} selected={selected} parseTab={parseTab} />`
  - `'files'` → `<DocumentFileTable>` with `renderRowActions` using `<ParseRowActions>`
  - `'preview'` → `<PreviewTabPanel doc={selectedDoc} />`

**Step 1: Write the hook**

```tsx
import { useCallback, useMemo, useState } from 'react';
import { IconFileCode, IconFiles, IconEye } from '@tabler/icons-react';
import type { WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { DocumentFileTable } from '@/components/documents/DocumentFileTable';
import { PreviewTabPanel } from '@/components/documents/PreviewTabPanel';
import { ParseTabPanel, useParseTab, ParseRowActions } from '@/components/documents/ParseTabPanel';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

export const PARSE_TABS: WorkbenchTab[] = [
  { id: 'parse', label: 'Parse', icon: IconFileCode },
  { id: 'files', label: 'Files', icon: IconFiles },
  { id: 'preview', label: 'Preview', icon: IconEye },
];

export const PARSE_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-parse', tabs: ['parse'], activeTab: 'parse', width: 20, minWidth: 16, maxWidth: 24, maxTabs: 1 },
  { id: 'pane-files', tabs: ['files'], activeTab: 'files', width: 30, minWidth: 22 },
  { id: 'pane-preview', tabs: ['preview'], activeTab: 'preview', width: 50 },
]);

export function useParseWorkbench() {
  useShellHeaderTitle({ title: 'Parse Documents' });
  const { resolvedProjectId } = useProjectFocus();

  const docState = useProjectDocuments(resolvedProjectId);
  const { docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, refreshDocs } = docState;

  const parseTab = useParseTab();

  const [activeDocUid, setActiveDocUid] = useState<string | null>(null);

  const activeDoc = useMemo(
    () => docs.find((d) => d.source_uid === activeDocUid) ?? null,
    [docs, activeDocUid],
  );

  const handleDocClick = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
  }, []);

  const renderRowActions = useCallback((doc: ProjectDocumentRow) => (
    <ParseRowActions doc={doc} parseTab={parseTab} />
  ), [parseTab]);

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'parse') {
      return <ParseTabPanel docs={docs} selected={selected} parseTab={parseTab} />;
    }

    if (tabId === 'files') {
      return (
        <DocumentFileTable
          docs={docs}
          loading={loading}
          error={error}
          selected={selected}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          allSelected={allSelected}
          someSelected={someSelected}
          activeDoc={activeDocUid}
          onDocClick={handleDocClick}
          renderRowActions={renderRowActions}
        />
      );
    }

    if (tabId === 'preview') {
      return <PreviewTabPanel doc={activeDoc} />;
    }

    return null;
  }, [docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, activeDocUid, activeDoc, handleDocClick, renderRowActions, parseTab]);

  return { renderContent };
}
```

**Step 2: Commit**

```bash
git add src/pages/useParseWorkbench.tsx
git commit -m "feat: create useParseWorkbench composition hook"
```

---

### Task 4: Rewrite `ParsePage.tsx` as a thin shell

**Files:**
- Rewrite: `src/pages/ParsePage.tsx`

**Step 1: Replace the entire file**

```tsx
import { Workbench } from '@/components/workbench/Workbench';
import { useParseWorkbench, PARSE_TABS, PARSE_DEFAULT_PANES } from './useParseWorkbench';

export default function ParsePage() {
  const { renderContent } = useParseWorkbench();
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={PARSE_TABS}
          defaultPanes={PARSE_DEFAULT_PANES}
          saveKey="parse-documents"
          renderContent={renderContent}
          hideToolbar
          maxColumns={3}
        />
      </div>
    </div>
  );
}
```

**Step 2: Verify the app compiles**

Run: `cd web && npx tsc --noEmit`
Expected: No errors (or pre-existing errors only)

**Step 3: Commit**

```bash
git add src/pages/ParsePage.tsx
git commit -m "refactor: ParsePage composes shared components via Workbench"
```

---

### Task 5: Verify router compatibility

**Files:**
- Check: `src/router.tsx`

**Step 1: Verify imports still work**

The router currently does:
```tsx
import ProjectAssetsPage from '@/pages/ProjectAssetsPage';
import ParsePage from '@/pages/ParsePage';
```

Both files still export defaults, so no router changes needed. Verify with:

Run: `cd web && npx tsc --noEmit`

**Step 2: Manual smoke test**

- Navigate to `/app/assets` — should show 3-pane workbench: Upload | Files | Preview
- Navigate to `/app/parse` — should show 3-pane workbench: Parse | Files | Preview
- Upload a file on Assets → file list refreshes
- Click a file → preview pane shows it
- On Parse page, select files and parse → progress shows, realtime status updates
- Drag pane dividers to resize
- Drag tabs between panes

**Step 3: Commit (if any fixes needed)**

---

### Task 6: Clean up dead code

**Files:**
- Check: `src/pages/ProjectAssetsPage.tsx` (old file — already replaced)
- Check: `src/pages/ParsePage.tsx` (old file — already replaced)

**Step 1: Verify no other files import the old page-local helpers**

Search for any imports of removed local types/functions (e.g. `compareRows`, `FileStatusIcon` from the pages, `ActionMenu`). These were page-local and should have no external consumers.

Run: `grep -r "compareRows\|ActionMenu\|FileStatusIcon" src/pages/ --include="*.tsx" --include="*.ts"`

Expected: No results (these only existed inside the old page files)

**Step 2: Final commit**

```bash
git add -A
git commit -m "refactor: remove 1600+ lines of duplicated page code, compose shared layer"
```

---

## What Changed (Summary)

| Before | After |
|--------|-------|
| `ProjectAssetsPage.tsx` — 749 lines, inline doc loading, upload, table, delete, download | 15 lines, composes `useAssetsWorkbench` |
| `ParsePage.tsx` — 864 lines, inline doc loading, realtime, parse, preview, badges | 15 lines, composes `useParseWorkbench` |
| `useAssetsWorkbench.tsx` — n/a | ~100 lines, wires shared components |
| `useParseWorkbench.tsx` — n/a | ~80 lines, wires shared components |
| **Total:** ~1600 lines of duplication | **Total:** ~210 lines of composition |

## What Was NOT Changed

- No shared components modified — they already have the right interfaces
- No router changes — default exports preserved
- No new UI components created — everything reused
- `useEltWorkbench.tsx` left as-is (it serves the broken ELT page; can be cleaned up later)
