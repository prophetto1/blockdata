# Parse Actions Restore — 5 Row Actions + Parse Preview System

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore the 5 per-row actions in the Parse page 3-dot menu and the parse-artifact preview system that was lost during the Workbench refactor.

**Architecture:** Add two optional callback props to `ParseRowActions` for preview triggers. Implement parse artifact data fetching (`conversion_representations`, `blocks` table) and preview state management in `useParseWorkbench`. Render parse-specific previews (Docling MD, blocks) in the Workbench preview pane, falling back to `PreviewTabPanel` for source files. All action logic lives in the composition layer (`useParseWorkbench`), not in shared components.

**Tech Stack:** React, Supabase (`conversion_representations`, `conversion_parsing`, `blocks` tables), `react-markdown`, `remark-gfm`, ScrollArea

---

## Target: 5 Per-Row Actions (3-dot menu)

| # | Action | Condition | Data source |
|---|--------|-----------|-------------|
| 1 | Docling MD Preview | parsed | `conversion_representations` → `markdown_bytes` → signed URL → fetch text → render markdown |
| 2 | Blocks Preview | parsed | `conversion_parsing` → `conv_uid` → `blocks` table → render block cards |
| 3 | Download DoclingJson | parsed | `conversion_representations` → `doclingdocument_json` → signed URL → open in new tab |
| 4 | Reset | not converting | `supabase.rpc('reset_source_document')` → refreshDocs |
| 5 | Delete | always | `supabase.rpc('delete_source_document')` → refreshDocs |

**Removed:** `View JSON` (modal showing formatted JSON) — not in target spec. The existing `handleDownloadJson` in `useParseTab` serves action #3.

---

## What is NOT Changing

- `ActionMenu` component — untouched (rendering, styling, click-outside behavior)
- `ParseTabPanel` toolbar layout — untouched (profile selector, parse buttons, progress bar)
- `DocumentFileTable` — untouched
- `PreviewTabPanel` — untouched (still handles source file preview)
- `StatusBadge` / `DispatchBadge` — untouched
- `useBatchParse` — untouched
- `useParseTab` return values — untouched (handleViewJson stays available, just not wired to menu)
- Parse pane layout (toolbar + file table in single pane) — untouched
- 2-pane Workbench structure (parse | preview) — untouched

---

### Task 1: Add preview callback props to ParseRowActions

**Files:**
- Modify: `web/src/components/documents/ParseTabPanel.tsx` (ParseRowActions only, lines 331-388)

**What changes:** Add two optional callback props. Update menu items for parsed docs. No layout/style changes.

**Step 1: Update ParseRowActions props and menu items**

Change the function signature from:

```tsx
export function ParseRowActions({
  doc,
  parseTab,
  onReset,
  onDelete,
}: {
  doc: ProjectDocumentRow;
  parseTab: ReturnType<typeof useParseTab>;
  onReset?: (uid: string) => void;
  onDelete?: (uid: string) => void;
}) {
```

To:

```tsx
export function ParseRowActions({
  doc,
  parseTab,
  onReset,
  onDelete,
  onDoclingMdPreview,
  onBlocksPreview,
}: {
  doc: ProjectDocumentRow;
  parseTab: ReturnType<typeof useParseTab>;
  onReset?: (uid: string) => void;
  onDelete?: (uid: string) => void;
  onDoclingMdPreview?: (doc: ProjectDocumentRow) => void;
  onBlocksPreview?: (doc: ProjectDocumentRow) => void;
}) {
```

Change the menu items block from:

```tsx
  const menuItems: { label: string; onClick: () => void; danger?: boolean }[] = [];

  if (isParsed) {
    menuItems.push(
      { label: 'View JSON', onClick: () => void handleViewJson(doc) },
      { label: 'Download JSON', onClick: () => void handleDownloadJson(doc) },
    );
  }
  if (!isConverting && onReset) {
    menuItems.push({ label: 'Reset', onClick: () => onReset(doc.source_uid) });
  }
  if (onDelete) {
    menuItems.push({ label: 'Delete', onClick: () => onDelete(doc.source_uid), danger: true });
  }
```

To:

```tsx
  const menuItems: { label: string; onClick: () => void; danger?: boolean }[] = [];

  if (isParsed) {
    if (onDoclingMdPreview) {
      menuItems.push({ label: 'Docling MD Preview', onClick: () => onDoclingMdPreview(doc) });
    }
    if (onBlocksPreview) {
      menuItems.push({ label: 'Blocks Preview', onClick: () => onBlocksPreview(doc) });
    }
    menuItems.push(
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

**Step 2: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add web/src/components/documents/ParseTabPanel.tsx
git commit -m "feat: add preview callback props to ParseRowActions"
```

---

### Task 2: Add parse artifact data fetchers to useParseWorkbench

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx`

**What changes:** Add `getArtifactLocator` and `fetchBlocks` — pure data functions, no UI. These are the same functions from the original ParsePage (origin/master lines 80-112).

**Step 1: Add imports and data functions**

Add to existing imports:

```tsx
import { supabase } from '@/lib/supabase';
```

Add constant after imports:

```tsx
const DOCUMENTS_BUCKET =
  (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';
```

Add these functions before the `useParseWorkbench` hook definition:

```tsx
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

type BlockRow = {
  block_uid: string;
  block_index: number;
  block_type: string;
  block_content: string;
};

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
```

**Step 2: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors (functions are standalone, no consumers yet)

**Step 3: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx
git commit -m "feat: add parse artifact data fetchers to useParseWorkbench"
```

---

### Task 3: Add parse preview state and action handlers

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx`

**What changes:** Add preview state (parsePreview, blocksPreview) and all 5 action handler functions inside `useParseWorkbench`.

**Step 1: Add state declarations**

Inside `useParseWorkbench()`, after the existing `activeDoc` useMemo, add:

```tsx
  const [parsePreview, setParsePreview] = useState<{
    title: string;
    markdown: string;
    loading: boolean;
  } | null>(null);

  const [blocksPreview, setBlocksPreview] = useState<{
    title: string;
    blocks: BlockRow[];
    loading: boolean;
  } | null>(null);
```

**Step 2: Add handler functions**

After the state declarations, add:

```tsx
  const handleDoclingMdPreview = useCallback(async (doc: ProjectDocumentRow) => {
    setParsePreview({ title: doc.doc_title, markdown: '', loading: true });
    setBlocksPreview(null);
    const locator = await getArtifactLocator(doc.source_uid, 'markdown_bytes');
    if (!locator) {
      setParsePreview({ title: doc.doc_title, markdown: 'No markdown available. Reset and re-parse with Docling.', loading: false });
      return;
    }
    const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(locator, 60 * 20);
    if (!data?.signedUrl) {
      setParsePreview({ title: doc.doc_title, markdown: 'Could not generate download URL.', loading: false });
      return;
    }
    try {
      const resp = await fetch(data.signedUrl);
      if (!resp.ok) throw new Error();
      const text = await resp.text();
      setParsePreview({ title: `${doc.doc_title} — Docling MD`, markdown: text, loading: false });
    } catch {
      setParsePreview({ title: doc.doc_title, markdown: 'Failed to load markdown.', loading: false });
    }
  }, []);

  const handleBlocksPreview = useCallback(async (doc: ProjectDocumentRow) => {
    setBlocksPreview({ title: doc.doc_title, blocks: [], loading: true });
    setParsePreview(null);
    const blocks = await fetchBlocks(doc.source_uid);
    setBlocksPreview({ title: doc.doc_title, blocks, loading: false });
  }, []);

  const handleReset = useCallback(async (uid: string) => {
    const { error: rpcErr } = await supabase.rpc('reset_source_document', { p_source_uid: uid });
    if (rpcErr) {
      console.error('Reset failed:', rpcErr.message);
      return;
    }
    refreshDocs();
  }, [refreshDocs]);

  const handleDelete = useCallback(async (uid: string) => {
    const { error: rpcErr } = await supabase.rpc('delete_source_document', { p_source_uid: uid });
    if (rpcErr) {
      console.error('Delete failed:', rpcErr.message);
      return;
    }
    if (activeDocUid === uid) setActiveDocUid(null);
    refreshDocs();
  }, [activeDocUid, refreshDocs]);
```

**Step 3: Update handleDocClick to clear parse previews**

When user clicks a row to view source file, dismiss any active parse preview:

Change from:

```tsx
  const handleDocClick = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
  }, []);
```

To:

```tsx
  const handleDocClick = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
    setParsePreview(null);
    setBlocksPreview(null);
  }, []);
```

**Step 4: Add `refreshDocs` to destructured docState**

The current line 28 doesn't destructure `refreshDocs`. Change from:

```tsx
  const { docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected } = docState;
```

To:

```tsx
  const { docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, refreshDocs } = docState;
```

**Step 5: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors

**Step 6: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx
git commit -m "feat: add parse preview state and action handlers"
```

---

### Task 4: Wire all 5 actions into ParseRowActions + ParseTabPanel toolbar

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx` (renderRowActions + renderContent parse branch)

**What changes:** Pass all callback props so the 5 menu items and toolbar bulk actions appear.

**Step 1: Update renderRowActions**

Change from:

```tsx
  const renderRowActions = useCallback((doc: ProjectDocumentRow) => (
    <ParseRowActions doc={doc} parseTab={parseTab} />
  ), [parseTab]);
```

To:

```tsx
  const renderRowActions = useCallback((doc: ProjectDocumentRow) => (
    <ParseRowActions
      doc={doc}
      parseTab={parseTab}
      onDoclingMdPreview={handleDoclingMdPreview}
      onBlocksPreview={handleBlocksPreview}
      onReset={handleReset}
      onDelete={handleDelete}
    />
  ), [parseTab, handleDoclingMdPreview, handleBlocksPreview, handleReset, handleDelete]);
```

**Step 2: Wire bulk Reset and Delete into ParseTabPanel**

Change from:

```tsx
          <ParseTabPanel docs={docs} selected={selected} parseTab={parseTab} />
```

To:

```tsx
          <ParseTabPanel
            docs={docs}
            selected={selected}
            parseTab={parseTab}
            onReset={(uids) => { for (const uid of uids) void handleReset(uid); }}
            onDelete={(uids) => { for (const uid of uids) void handleDelete(uid); }}
          />
```

**Step 3: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors

**Step 4: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx
git commit -m "feat: wire all 5 parse actions into row menu and toolbar"
```

---

### Task 5: Render parse artifact previews in the Workbench preview pane

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx` (renderContent preview branch + imports)

**What changes:** The preview pane checks parse preview state first. If active, renders parse-specific preview (Docling MD rendered as markdown, or block cards). Otherwise falls back to `PreviewTabPanel` for source file preview.

**Step 1: Add imports**

Add to existing imports:

```tsx
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconX, IconLoader2 } from '@tabler/icons-react';
```

**Step 2: Replace the preview branch in renderContent**

Change from:

```tsx
    if (tabId === 'preview') {
      return <PreviewTabPanel doc={activeDoc} />;
    }
```

To:

```tsx
    if (tabId === 'preview') {
      if (parsePreview?.loading || blocksPreview?.loading) {
        return (
          <div className="flex h-full items-center justify-center">
            <IconLoader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        );
      }

      if (parsePreview) {
        return (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <h3 className="truncate text-sm font-medium text-foreground">{parsePreview.title}</h3>
              <button
                type="button"
                onClick={() => setParsePreview(null)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <IconX size={14} />
              </button>
            </div>
            <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
              <div className="parse-markdown-preview px-6 py-4">
                <Markdown remarkPlugins={[remarkGfm]}>{parsePreview.markdown}</Markdown>
              </div>
            </ScrollArea>
          </div>
        );
      }

      if (blocksPreview) {
        return (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <h3 className="truncate text-sm font-medium text-foreground">
                {blocksPreview.title} — {blocksPreview.blocks.length} blocks
              </h3>
              <button
                type="button"
                onClick={() => setBlocksPreview(null)}
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

      return <PreviewTabPanel doc={activeDoc} />;
    }
```

**Step 3: Update renderContent dependency array**

Add `parsePreview`, `blocksPreview`, `handleReset`, `handleDelete` to the useCallback deps:

```tsx
  }, [docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, activeDocUid, activeDoc, handleDocClick, renderRowActions, parseTab, parsePreview, blocksPreview, handleReset, handleDelete]);
```

**Step 4: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors

**Step 5: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx
git commit -m "feat: render parse artifact previews in Workbench preview pane"
```

---

### Task 6: Manual smoke test

**No code changes.** Verify all 5 actions work end-to-end.

**Step 1: Start dev server**

Run: `cd web && npm run dev`

**Step 2: Navigate to Parse page**

Go to `/app/parse`, select a project with documents.

**Step 3: Test each action**

1. **Parse a file** → select unparsed file, click play button or "Parse All" → wait for status to become "parsed"
2. **Docling MD Preview** → click 3-dot menu on a parsed file → "Docling MD Preview" → preview pane shows loading spinner then rendered markdown with title "DocTitle — Docling MD"
3. **Blocks Preview** → click 3-dot menu → "Blocks Preview" → preview pane shows block cards with type badge, index number, content text. If no blocks: "No blocks found. Reset and re-parse with Docling."
4. **Download DoclingJson** → click 3-dot menu → "Download DoclingJson" → browser opens JSON file in new tab
5. **Reset** → click 3-dot menu → "Reset" → doc status returns to "uploaded", preview stays unchanged
6. **Delete** → click 3-dot menu → "Delete" → doc removed from list
7. **X button** → close parse preview via X → falls back to `PreviewTabPanel` source file view (or "Select an asset to preview" if no doc selected)
8. **Row click clears parse preview** → while parse preview is showing, click a different row → parse preview dismissed, source file preview shown
9. **Toolbar bulk actions** → select multiple files → "Reset (N)" and "Delete (N)" buttons appear in toolbar and work

**Step 4: Commit (only if fixes needed)**

---

## Summary of Changes

| File | Change | Lines |
|------|--------|-------|
| `web/src/components/documents/ParseTabPanel.tsx` | Add 2 optional props to `ParseRowActions`, update menu items | ~10 lines changed |
| `web/src/pages/useParseWorkbench.tsx` | Add data fetchers, preview state, 4 handlers, preview rendering, wire all props | ~140 lines added |

## What is NOT Changed

- No shared component layouts or styles modified
- No new files created
- No new dependencies added (`react-markdown`, `remark-gfm`, `ScrollArea` already in use)
- No router changes
- `PreviewTabPanel` untouched — still renders source files when no parse preview is active
- `useParseTab` untouched — `handleDownloadJson` reused as-is for action #3
