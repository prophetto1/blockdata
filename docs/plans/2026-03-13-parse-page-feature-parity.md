# Parse Page Feature Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the refactored Parse page (thin shell + `useParseWorkbench` + shared components) to full feature parity with the monolithic `origin/master:web/src/pages/ParsePage.tsx` (814 lines).

**Architecture:** The page shell and composition hooks already exist. This plan adds the missing features by: (1) adding an `updateDocs` escape hatch to `useProjectDocuments`, (2) expanding `useParseTab` with preview/download/artifact handlers, (3) wiring reset/delete/preview callbacks through `useParseWorkbench`, (4) adding a Profile extra column, (5) adding a parse-result preview panel for the right pane, and (6) cleaning up the Assets page to hide the Status column.

**Tech Stack:** React, Supabase, react-markdown, remark-gfm, existing shared components

---

## Current State

These files already exist and work:

| File | State |
|------|-------|
| `web/src/pages/ParsePage.tsx` | Thin shell (~22 lines), uses Workbench |
| `web/src/pages/useParseWorkbench.tsx` | Composition hook (~79 lines), wires ParseTabPanel + DocumentFileTable + PreviewTabPanel |
| `web/src/pages/ProjectAssetsPage.tsx` | Thin shell (~20 lines), uses Workbench |
| `web/src/pages/useAssetsWorkbench.tsx` | Composition hook (~123 lines) |
| `web/src/components/documents/ParseTabPanel.tsx` | Toolbar + JSON modal + ParseRowActions. Has `onReset`/`onDelete` props but they are not wired. |
| `web/src/components/documents/DocumentFileTable.tsx` | Shared table with `hideStatus` and `extraColumns` props (not yet used) |
| `web/src/hooks/useProjectDocuments.ts` | Shared hook for doc loading, realtime, selection |

## Feature Gap (remote monolithic → refactored)

| Feature | Remote ParsePage | Refactored | Status |
|---------|-----------------|------------|--------|
| Profile selector + Parse All/Selected toolbar | ✓ (inline) | ✓ (ParseTabPanel) | Done |
| Reset bulk / Reset All toolbar buttons | ✓ (inline) | ✓ (ParseTabPanel, gated on `onReset`) | **Needs wiring** |
| Delete bulk toolbar button | ✓ (inline) | ✓ (ParseTabPanel, gated on `onDelete`) | **Needs wiring** |
| Profile column in table | ✓ (inline `<td>`) | ✗ | **Missing** |
| Per-row Parse button + spinner | ✓ (inline) | ✓ (ParseRowActions) | Done |
| Per-row ActionMenu: Reset/Delete | ✓ | ✓ (ParseRowActions, gated on `onReset`/`onDelete`) | **Needs wiring** |
| Per-row ActionMenu: Original Preview | ✓ | ✗ | **Missing** |
| Per-row ActionMenu: Docling MD Preview | ✓ | ✗ | **Missing** |
| Per-row ActionMenu: Blocks Preview | ✓ | ✗ | **Missing** |
| Per-row ActionMenu: Download MD | ✓ | ✗ | **Missing** |
| Per-row ActionMenu: Download DoclingJson | ✓ | ✗ | **Missing** |
| `applyProfileToDispatchedDocs` (instant UI) | ✓ | ✗ | **Missing** |
| `getArtifactLocator` (conversion_representations) | ✓ | ✗ | **Missing** |
| `fetchBlocks` (blocks table) | ✓ | ✗ | **Missing** |
| Right panel: Docling MD rendered markdown | ✓ | ✗ | **Missing** |
| Right panel: Original raw text | ✓ | ✗ | **Missing** |
| Right panel: Blocks list | ✓ | ✗ | **Missing** |
| Assets page hides Status column | N/A | ✗ | **Missing** |
| ParseTabPanel unused imports (IconEye, IconDownload) | N/A | Present | **Cleanup** |

---

### Task 1: Add `updateDocs` to `useProjectDocuments`

**Why:** `applyProfileToDispatchedDocs` needs to optimistically set `pipeline_config` on docs before the realtime update arrives. The shared hook currently exposes no way to mutate `docs` from outside.

**Files:**
- Modify: `web/src/hooks/useProjectDocuments.ts`

**Step 1: Add `updateDocs` to the hook's return value**

Add this after the `refreshDocs` definition (around line 70):

```ts
const updateDocs = useCallback(
  (updater: (prev: ProjectDocumentRow[]) => ProjectDocumentRow[]) => {
    setDocs(updater);
  },
  [],
);
```

Add `updateDocs` to the return object (line 101-113):

```ts
return {
  docs,
  loading,
  error,
  selected,
  toggleSelect,
  toggleSelectAll,
  clearSelection,
  allSelected,
  someSelected,
  selectedDocs,
  refreshDocs,
  updateDocs,
};
```

**Step 2: Verify TypeScript compiles**

Run: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | head -30`

**Step 3: Commit**

```bash
git add web/src/hooks/useProjectDocuments.ts
git commit -m "feat: expose updateDocs on useProjectDocuments for optimistic updates"
```

---

### Task 2: Add artifact lookup, blocks fetch, preview/download handlers to `useParseTab`

**Why:** The monolithic ParsePage has `getArtifactLocator`, `fetchBlocks`, preview handlers, and download handlers inline. These are parse-specific state/logic and belong in `useParseTab`, alongside the existing JSON view/download handlers.

**Files:**
- Modify: `web/src/components/documents/ParseTabPanel.tsx`

**Step 1: Add module-level helpers after the `DOCUMENTS_BUCKET` constant (around line 18)**

Insert after `const DOCUMENTS_BUCKET = ...;`:

```ts
/** Look up the storage key for a parsed artifact from conversion_representations. */
async function getArtifactLocator(
  sourceUid: string,
  reprType: 'markdown_bytes' | 'doclingdocument_json',
): Promise<string | null> {
  const { data } = await supabase
    .from('conversion_representations')
    .select('artifact_locator')
    .eq('source_uid', sourceUid)
    .eq('representation_type', reprType)
    .maybeSingle();
  return data?.artifact_locator ?? null;
}

export type BlockRow = {
  block_uid: string;
  block_index: number;
  block_type: string;
  block_content: string;
};

/** Fetch blocks from the blocks table for a given source_uid. */
async function fetchBlocks(sourceUid: string): Promise<BlockRow[]> {
  const { data: conv } = await supabase
    .from('conversion_parsing')
    .select('conv_uid')
    .eq('source_uid', sourceUid)
    .maybeSingle();
  if (!conv?.conv_uid) return [];
  const { data: blocks } = await supabase
    .from('blocks')
    .select('block_uid, block_index, block_type, block_content')
    .eq('conv_uid', conv.conv_uid)
    .order('block_index', { ascending: true });
  return (blocks ?? []) as BlockRow[];
}

async function signedUrlForArtifact(
  sourceUid: string,
  reprType: 'markdown_bytes' | 'doclingdocument_json',
): Promise<string | null> {
  const locator = await getArtifactLocator(sourceUid, reprType);
  if (!locator) return null;
  const { data } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(locator, 60 * 20);
  return data?.signedUrl ?? null;
}

async function downloadBlob(url: string, filename: string) {
  const resp = await fetch(url);
  if (!resp.ok) return;
  const blob = await resp.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
```

**Step 2: Add preview/download state and handlers to `useParseTab` hook**

Add state declarations after the existing `jsonModal` state (inside `useParseTab`, around line 86):

```ts
const [preview, setPreview] = useState<{ title: string; markdown: string; loading: boolean; isRaw?: boolean } | null>(null);
const [blocksPreview, setBlocksPreview] = useState<{ title: string; blocks: BlockRow[]; loading: boolean } | null>(null);
```

Add handlers after the existing `handleDownloadJson` function (around line 150):

```ts
const handleOriginalPreview = async (doc: ProjectDocumentRow) => {
  setPreview({ title: doc.doc_title, markdown: '', loading: true });
  setBlocksPreview(null);
  const locator = doc.source_locator?.replace(/^\/+/, '');
  if (!locator) {
    setPreview({ title: doc.doc_title, markdown: 'No source file available.', loading: false });
    return;
  }
  const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(locator, 60 * 20);
  if (!data?.signedUrl) {
    setPreview({ title: doc.doc_title, markdown: 'Could not load source file.', loading: false });
    return;
  }
  try {
    const resp = await fetch(data.signedUrl);
    if (!resp.ok) throw new Error();
    const text = await resp.text();
    setPreview({ title: `${doc.doc_title} — Original`, markdown: text, loading: false, isRaw: true });
  } catch {
    setPreview({ title: doc.doc_title, markdown: 'Could not load source file.', loading: false });
  }
};

const handleDoclingMdPreview = async (doc: ProjectDocumentRow) => {
  setPreview({ title: doc.doc_title, markdown: '', loading: true });
  setBlocksPreview(null);
  const url = await signedUrlForArtifact(doc.source_uid, 'markdown_bytes');
  if (!url) {
    setPreview({ title: doc.doc_title, markdown: 'No markdown available. Reset and re-parse with Docling.', loading: false });
    return;
  }
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error();
    const text = await resp.text();
    setPreview({ title: `${doc.doc_title} — Docling MD`, markdown: text, loading: false });
  } catch {
    setPreview({ title: doc.doc_title, markdown: 'No markdown available. Reset and re-parse with Docling.', loading: false });
  }
};

const handleBlocksPreview = async (doc: ProjectDocumentRow) => {
  setBlocksPreview({ title: doc.doc_title, blocks: [], loading: true });
  setPreview(null);
  const blocks = await fetchBlocks(doc.source_uid);
  setBlocksPreview({ title: doc.doc_title, blocks, loading: false });
};

const handleDownloadMd = async (doc: ProjectDocumentRow) => {
  const url = await signedUrlForArtifact(doc.source_uid, 'markdown_bytes');
  if (url) await downloadBlob(url, `${doc.doc_title}.md`);
};
```

**Step 3: Update the return object of `useParseTab`**

Replace the current return block with:

```ts
return {
  profiles,
  selectedProfileId,
  handleProfileChange,
  batch,
  jsonModal,
  setJsonModal,
  handleViewJson,
  handleDownloadJson,
  preview,
  setPreview,
  blocksPreview,
  setBlocksPreview,
  handleOriginalPreview,
  handleDoclingMdPreview,
  handleBlocksPreview,
  handleDownloadMd,
};
```

**Step 4: Remove unused imports `IconEye` and `IconDownload`**

Remove `IconEye` and `IconDownload` from the import block at line 5 (they are no longer used after the ActionMenu refactor).

**Step 5: Verify TypeScript compiles**

Run: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | head -30`

**Step 6: Commit**

```bash
git add web/src/components/documents/ParseTabPanel.tsx
git commit -m "feat: add artifact lookup, preview, and download handlers to useParseTab"
```

---

### Task 3: Expand `ParseRowActions` with full action menu

**Why:** The remote ParsePage's action menu has: Original Preview, Docling MD Preview, Blocks Preview, Download MD, Download DoclingJson, Reset, Delete. The current `ParseRowActions` only has: View JSON, Download JSON, Reset, Delete.

**Files:**
- Modify: `web/src/components/documents/ParseTabPanel.tsx` (the `ParseRowActions` component, around line 330)

**Step 1: Update the `menuItems` construction in `ParseRowActions`**

Replace the current `menuItems` block (the `if (isParsed)` / `if (!isConverting)` / `if (onDelete)` section) with:

```ts
const menuItems: { label: string; onClick: () => void; danger?: boolean }[] = [];

if (isParsed) {
  // Preview actions — only show Original Preview for text-like formats
  const format = (doc as any).source_locator
    ? ((doc.source_locator ?? '').split('.').pop() ?? '').toLowerCase()
    : '';
  if (['md', 'txt', 'csv', 'html', 'htm', 'rst', 'org', 'tex', 'latex'].includes(format)) {
    menuItems.push({ label: 'Original Preview', onClick: () => void handleOriginalPreview(doc) });
  }
  menuItems.push(
    { label: 'Docling MD Preview', onClick: () => void handleDoclingMdPreview(doc) },
    { label: 'Blocks Preview', onClick: () => void handleBlocksPreview(doc) },
    { label: 'Download MD', onClick: () => void handleDownloadMd(doc) },
    { label: 'Download DoclingJson', onClick: () => void handleDownloadJson(doc) },
  );
}
if (!isConverting && onReset) {
  menuItems.push({ label: 'Reset', onClick: () => onReset(doc.source_uid) });
}
if (onDelete) {
  menuItems.push({ label: 'Delete', onClick: () => onDelete(doc.source_uid), danger: true });
}
```

**Step 2: Update the destructured values from `parseTab` in `ParseRowActions`**

Change:
```ts
const { batch, handleViewJson, handleDownloadJson } = parseTab;
```
To:
```ts
const { batch, handleDownloadJson, handleOriginalPreview, handleDoclingMdPreview, handleBlocksPreview, handleDownloadMd } = parseTab;
```

**Step 3: Import `getDocumentFormat` for format detection**

Add to the import block:
```ts
import { getDocumentFormat } from '@/lib/projectDetailHelpers';
```

Then update the format detection in Step 1 to use:
```ts
const format = getDocumentFormat(doc).toLowerCase();
if (['md', 'txt', 'csv', 'html', 'htm', 'rst', 'org', 'tex', 'latex'].includes(format)) {
```

(Remove the manual `source_locator` splitting.)

**Step 4: Verify TypeScript compiles**

Run: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | head -30`

**Step 5: Commit**

```bash
git add web/src/components/documents/ParseTabPanel.tsx
git commit -m "feat: expand ParseRowActions with full preview/download action menu"
```

---

### Task 4: Wire reset, delete, profile column, and optimistic updates in `useParseWorkbench`

**Why:** `useParseWorkbench` currently passes no `onReset`/`onDelete` callbacks to `ParseTabPanel` or `ParseRowActions`, has no Profile extra column, and doesn't call `applyProfileToDispatchedDocs`.

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx`

**Step 1: Rewrite `useParseWorkbench.tsx` with all features**

Replace the entire file with:

```tsx
import { useCallback, useMemo, useState } from 'react';
import { IconFileCode, IconEye } from '@tabler/icons-react';
import type { WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { DocumentFileTable, type ExtraColumn } from '@/components/documents/DocumentFileTable';
import { PreviewTabPanel } from '@/components/documents/PreviewTabPanel';
import { ParseTabPanel, useParseTab, ParseRowActions } from '@/components/documents/ParseTabPanel';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { supabase } from '@/lib/supabase';

export const PARSE_TABS: WorkbenchTab[] = [
  { id: 'parse', label: 'Parse', icon: IconFileCode },
  { id: 'preview', label: 'Preview', icon: IconEye },
];

export const PARSE_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-parse', tabs: ['parse'], activeTab: 'parse', width: 44 },
  { id: 'pane-preview', tabs: ['preview'], activeTab: 'preview', width: 56 },
]);

export function useParseWorkbench() {
  useShellHeaderTitle({ title: 'Parse Documents' });
  const { resolvedProjectId } = useProjectFocus();

  const docState = useProjectDocuments(resolvedProjectId);
  const { docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, refreshDocs, updateDocs } = docState;

  const parseTab = useParseTab();

  const [activeDocUid, setActiveDocUid] = useState<string | null>(null);

  const activeDoc = useMemo(
    () => docs.find((d) => d.source_uid === activeDocUid) ?? null,
    [docs, activeDocUid],
  );

  const handleDocClick = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
  }, []);

  // ── Reset / Delete handlers ──────────────────────────────────────────────

  const handleReset = useCallback(async (uid: string) => {
    const { error: rpcErr } = await supabase.rpc('reset_source_document', { p_source_uid: uid });
    if (rpcErr) {
      console.error('Reset failed:', rpcErr.message);
      return;
    }
    updateDocs((prev) => prev.map((d) => d.source_uid === uid ? { ...d, status: 'uploaded', error: null } : d));
  }, [updateDocs]);

  const handleBulkReset = useCallback(async (uids: string[]) => {
    for (const uid of uids) await handleReset(uid);
  }, [handleReset]);

  const handleDelete = useCallback(async (uid: string) => {
    const { error: rpcErr } = await supabase.rpc('delete_source_document', { p_source_uid: uid });
    if (rpcErr) {
      console.error('Delete failed:', rpcErr.message);
      return;
    }
    updateDocs((prev) => prev.filter((d) => d.source_uid !== uid));
    if (activeDocUid === uid) setActiveDocUid(null);
  }, [activeDocUid, updateDocs]);

  const handleBulkDelete = useCallback(async (uids: string[]) => {
    for (const uid of uids) await handleDelete(uid);
  }, [handleDelete]);

  // ── Optimistic profile update on dispatch ────────────────────────────────

  const applyProfileToDispatchedDocs = useCallback((uids: string[]) => {
    const profile = parseTab.profiles.find((p) => p.id === parseTab.selectedProfileId);
    if (!profile) return;
    const config = profile.config;
    const uidSet = new Set(uids);
    updateDocs((prev) =>
      prev.map((d) => uidSet.has(d.source_uid) ? { ...d, pipeline_config: config } : d),
    );
  }, [parseTab.profiles, parseTab.selectedProfileId, updateDocs]);

  // ── Profile extra column ─────────────────────────────────────────────────

  const profileColumn: ExtraColumn = useMemo(() => ({
    header: 'Profile',
    render: (doc: ProjectDocumentRow) => {
      const config = doc.pipeline_config as Record<string, unknown> | null;
      return (
        <span className="text-xs text-muted-foreground">
          {config ? String(config._profile_name ?? config.name ?? '—') : '—'}
        </span>
      );
    },
  }), []);

  const extraColumns = useMemo(() => [profileColumn], [profileColumn]);

  // ── Row actions ──────────────────────────────────────────────────────────

  const renderRowActions = useCallback((doc: ProjectDocumentRow) => (
    <ParseRowActions
      doc={doc}
      parseTab={parseTab}
      onReset={(uid) => void handleReset(uid)}
      onDelete={(uid) => void handleDelete(uid)}
    />
  ), [parseTab, handleReset, handleDelete]);

  // ── Wrapped parse start (applies profile optimistically) ─────────────────

  const wrappedBatchStart = useCallback((uids: string[]) => {
    applyProfileToDispatchedDocs(uids);
    parseTab.batch.start(uids);
  }, [applyProfileToDispatchedDocs, parseTab.batch]);

  // ── Render content ───────────────────────────────────────────────────────

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'parse') {
      return (
        <div className="flex h-full flex-col">
          <ParseTabPanel
            docs={docs}
            selected={selected}
            parseTab={parseTab}
            onReset={handleBulkReset}
            onDelete={handleBulkDelete}
            onBatchStart={wrappedBatchStart}
          />
          <div className="min-h-0 flex-1">
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
              extraColumns={extraColumns}
            />
          </div>
        </div>
      );
    }

    if (tabId === 'preview') {
      return <PreviewTabPanel doc={activeDoc} />;
    }

    return null;
  }, [docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, activeDocUid, activeDoc, handleDocClick, renderRowActions, parseTab, handleBulkReset, handleBulkDelete, wrappedBatchStart, extraColumns]);

  return { renderContent };
}
```

**Important note on `onBatchStart`:** The `ParseTabPanel` currently calls `batch.start()` directly for "Parse All" and "Parse Selected" buttons. To intercept these with `applyProfileToDispatchedDocs`, we need an `onBatchStart` prop on `ParseTabPanel`. See Task 5.

**Step 2: Verify TypeScript compiles (will fail until Task 5 adds `onBatchStart` prop)**

Run: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | head -30`

**Step 3: Commit (after Task 5)**

Combined with Task 5 commit.

---

### Task 5: Add `onBatchStart` prop to `ParseTabPanel`

**Why:** The toolbar's "Parse All" and "Parse Selected" buttons call `batch.start()` directly. To support `applyProfileToDispatchedDocs`, the composition hook needs to intercept these calls. An optional `onBatchStart` callback replaces the direct `batch.start()` call when provided.

**Files:**
- Modify: `web/src/components/documents/ParseTabPanel.tsx`

**Step 1: Add `onBatchStart` to `ParseTabPanelProps`**

In the `ParseTabPanelProps` interface (around line 166), add:

```ts
interface ParseTabPanelProps {
  docs: ProjectDocumentRow[];
  selected: Set<string>;
  parseTab: ReturnType<typeof useParseTab>;
  onReset?: (uids: string[]) => void;
  onDelete?: (uids: string[]) => void;
  onBatchStart?: (uids: string[]) => void;
}
```

**Step 2: Use `onBatchStart` in the component**

In `ParseTabPanel` function signature, destructure it:

```ts
export function ParseTabPanel({ docs, selected, parseTab, onReset, onDelete, onBatchStart }: ParseTabPanelProps) {
```

Create a resolved start function:

```ts
const startParse = onBatchStart ?? batch.start;
```

Replace the two `batch.start(...)` calls in the toolbar buttons:

- "Parse All" button `onClick`: change `batch.start(unparsedUids)` → `startParse(unparsedUids)`
- "Parse Selected" button `onClick`: change `batch.start(selectedUids)` → `startParse(selectedUids)`

**Step 3: Verify TypeScript compiles**

Run: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | head -30`

**Step 4: Commit**

```bash
git add web/src/components/documents/ParseTabPanel.tsx web/src/pages/useParseWorkbench.tsx web/src/hooks/useProjectDocuments.ts
git commit -m "feat: wire reset, delete, profile column, and optimistic updates in parse workbench"
```

---

### Task 6: Add parse-result preview to the right pane

**Why:** The remote ParsePage's right panel shows rendered markdown (Docling MD), raw text (Original Preview), and structured blocks. The current refactored version only shows `PreviewTabPanel` (original document viewer). The right pane needs to conditionally render parse-result previews when triggered from the action menu.

**Files:**
- Create: `web/src/components/documents/ParsePreviewPanel.tsx`
- Modify: `web/src/pages/useParseWorkbench.tsx`

**Step 1: Create `ParsePreviewPanel.tsx`**

```tsx
import { IconLoader2, IconX } from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BlockRow } from '@/components/documents/ParseTabPanel';

interface ParsePreviewPanelProps {
  preview: { title: string; markdown: string; loading: boolean; isRaw?: boolean } | null;
  blocksPreview: { title: string; blocks: BlockRow[]; loading: boolean } | null;
  onClosePreview: () => void;
  onCloseBlocks: () => void;
}

export function ParsePreviewPanel({ preview, blocksPreview, onClosePreview, onCloseBlocks }: ParsePreviewPanelProps) {
  if (!preview && !blocksPreview) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <p>Select a parsed file's action menu to preview</p>
      </div>
    );
  }

  if (preview?.loading || blocksPreview?.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <IconLoader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (preview && !preview.loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <h3 className="truncate text-sm font-medium text-foreground">{preview.title}</h3>
          <button
            type="button"
            onClick={onClosePreview}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <IconX size={14} />
          </button>
        </div>
        <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
          {preview.isRaw ? (
            <pre className="whitespace-pre-wrap break-words px-6 py-4 font-mono text-xs text-foreground">{preview.markdown}</pre>
          ) : (
            <div className="parse-markdown-preview px-6 py-4">
              <Markdown remarkPlugins={[remarkGfm]}>{preview.markdown}</Markdown>
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  if (blocksPreview && !blocksPreview.loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <h3 className="truncate text-sm font-medium text-foreground">
            {blocksPreview.title} — {blocksPreview.blocks.length} blocks
          </h3>
          <button
            type="button"
            onClick={onCloseBlocks}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <IconX size={14} />
          </button>
        </div>
        <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
          {blocksPreview.blocks.length === 0 ? (
            <div className="px-6 py-4 text-sm text-muted-foreground">No blocks found. Reset and re-parse with Docling.</div>
          ) : (
            <div className="divide-y divide-border">
              {blocksPreview.blocks.map((b) => (
                <div key={b.block_uid} className="px-4 py-2">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="inline-flex rounded bg-muted/60 px-1.5 py-0 text-[9px] font-semibold uppercase leading-4 text-muted-foreground">
                      {b.block_type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">#{b.block_index}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-xs text-foreground">{b.block_content}</div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  return null;
}
```

**Step 2: Update `useParseWorkbench` to use `ParsePreviewPanel` in the preview tab**

In the `renderContent` function's `'preview'` branch, replace:

```tsx
if (tabId === 'preview') {
  return <PreviewTabPanel doc={activeDoc} />;
}
```

With:

```tsx
if (tabId === 'preview') {
  const { preview, setPreview, blocksPreview, setBlocksPreview } = parseTab;
  // Show parse-result preview if active, otherwise show original doc preview
  if (preview || blocksPreview) {
    return (
      <ParsePreviewPanel
        preview={preview}
        blocksPreview={blocksPreview}
        onClosePreview={() => setPreview(null)}
        onCloseBlocks={() => setBlocksPreview(null)}
      />
    );
  }
  return <PreviewTabPanel doc={activeDoc} />;
}
```

Add the import at the top of `useParseWorkbench.tsx`:

```ts
import { ParsePreviewPanel } from '@/components/documents/ParsePreviewPanel';
```

**Step 3: Verify TypeScript compiles**

Run: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | head -30`

**Step 4: Commit**

```bash
git add web/src/components/documents/ParsePreviewPanel.tsx web/src/pages/useParseWorkbench.tsx
git commit -m "feat: add parse-result preview panel (markdown, blocks) to parse workbench"
```

---

### Task 7: Hide Status column on Assets page

**Why:** The Assets page should not show parse status. `DocumentFileTable` already has a `hideStatus` prop. `useAssetsWorkbench` just needs to pass it.

**Files:**
- Modify: `web/src/pages/useAssetsWorkbench.tsx`

**Step 1: Add `hideStatus` to the `DocumentFileTable` in the `'files'` branch**

In `useAssetsWorkbench.tsx`, find the `DocumentFileTable` render (around line 97-111) and add the prop:

```tsx
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
  hideStatus
/>
```

**Step 2: Verify TypeScript compiles**

Run: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | head -30`

**Step 3: Commit**

```bash
git add web/src/pages/useAssetsWorkbench.tsx
git commit -m "fix: hide parse status column on Assets file table"
```

---

### Task 8: Final verification

**Files:**
- All modified files from Tasks 1-7

**Step 1: Full TypeScript check**

Run: `cd e:/writing-system/web && npx tsc --noEmit`
Expected: No new errors.

**Step 2: Verify no unused imports**

Run: `cd e:/writing-system/web && npx tsc --noEmit 2>&1 | grep -i "unused\|declared but"`
Expected: No results from our modified files.

**Step 3: Dev server smoke test**

Run: `cd e:/writing-system/web && npm run dev`

Manual checks:
- `/app/assets` — 3-pane workbench: Upload | Files | Preview
  - Files table has NO Status column
  - Download/delete row actions work
  - Click row → preview shows original document
  - Pane drag/resize works
- `/app/parse` — 2-pane workbench: Parse (toolbar+table) | Preview
  - Files table has Status + Profile columns
  - Profile selector in toolbar works
  - Parse All / Parse Selected buttons dispatch parse and show profile instantly
  - Reset / Reset All / Delete toolbar buttons appear when applicable
  - Per-row ActionMenu has: Original Preview (text files only), Docling MD Preview, Blocks Preview, Download MD, Download DoclingJson, Reset, Delete
  - Clicking "Docling MD Preview" shows rendered markdown in right pane
  - Clicking "Blocks Preview" shows block list in right pane
  - Closing parse preview returns to original document preview
  - Pane drag/resize works

**Step 4: Final commit if any fixes needed**

---

## Summary of Changes

| File | Action | Lines |
|------|--------|-------|
| `web/src/hooks/useProjectDocuments.ts` | Add `updateDocs` | +6 |
| `web/src/components/documents/ParseTabPanel.tsx` | Add artifact helpers, preview/download handlers, expand ActionMenu, add `onBatchStart` | +120 |
| `web/src/components/documents/ParsePreviewPanel.tsx` | New component for parse-result previews | +100 |
| `web/src/pages/useParseWorkbench.tsx` | Wire reset/delete/profile/optimistic/preview | Full rewrite (~140 lines) |
| `web/src/pages/useAssetsWorkbench.tsx` | Add `hideStatus` prop | +1 |
| `web/src/pages/ParsePage.tsx` | No change (already thin shell) | 0 |
| `web/src/pages/ProjectAssetsPage.tsx` | No change (already thin shell) | 0 |
