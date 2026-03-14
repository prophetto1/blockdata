# Parse Actions Restore — 5 Row Actions + 3-Tab Preview Pane

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore the 5 per-row actions in the Parse page 3-dot menu and the parse-artifact preview system that was lost during the Workbench refactor.

**Architecture:** The preview pane gets 3 dedicated tabs (Docling MD, Preview, Blocks) instead of alternating views in one tab. Each tab is a self-contained component that fetches data based on `activeDocUid`. The 3-dot menu actions set the active doc and programmatically switch to the relevant tab via the Workbench `addTab` ref API. Two optional callback props are added to `ParseRowActions`. All new logic lives in the composition layer (`useParseWorkbench.tsx`).

**Tech Stack:** React, Supabase (`conversion_representations`, `conversion_parsing`, `blocks` tables), `react-markdown`, `remark-gfm`, ScrollArea, Workbench ref (`WorkbenchHandle.addTab`)

---

## Target: 5 Per-Row Actions (3-dot menu)

| # | Action | Condition | Behavior |
|---|--------|-----------|----------|
| 1 | Docling MD Preview | parsed | Sets `activeDocUid` → switches to `docling-md` tab → tab fetches `markdown_bytes` from `conversion_representations` → renders markdown |
| 2 | Blocks Preview | parsed | Sets `activeDocUid` → switches to `blocks` tab → tab fetches blocks from `blocks` table → renders block cards |
| 3 | Download DoclingJson | parsed | Existing `handleDownloadJson` from `useParseTab` — opens signed URL in new tab |
| 4 | Reset | not converting | `supabase.rpc('reset_source_document')` → `refreshDocs()` |
| 5 | Delete | always | `supabase.rpc('delete_source_document')` → `refreshDocs()` |

**Removed:** `View JSON` (modal showing formatted JSON) — not in target spec.

## Preview Pane: 3 Tabs

| Tab ID | Label | Content |
|--------|-------|---------|
| `docling-md` | Docling MD | Reconstructed markdown from `markdown_bytes` artifact (via `conversion_representations`). Self-contained component with own fetch/loading/error. |
| `preview` | Preview | Source file preview via `PreviewTabPanel` (unchanged). |
| `blocks` | Blocks | Block cards from `blocks` table (via `conversion_parsing` → `conv_uid`). Self-contained component with own fetch/loading/error. |

---

## What is NOT Changing

- `ActionMenu` component — untouched (rendering, styling, click-outside behavior)
- `ParseTabPanel` toolbar layout — untouched (profile selector, parse buttons, progress bar)
- `DocumentFileTable` — untouched
- `PreviewTabPanel` — untouched (still handles source file preview in its own tab)
- `StatusBadge` / `DispatchBadge` — untouched
- `useBatchParse` — untouched
- `useParseTab` return values — untouched (`handleDownloadJson` reused as-is for action #3)
- `Workbench` component — untouched (already supports multi-tab panes and ref API)

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

### Task 2: Add parse artifact data fetchers

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

Add these functions before `PARSE_TABS`:

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

### Task 3: Create DoclingMdTab and BlocksTab components

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx`

**What changes:** Add two self-contained tab components that manage their own data fetching and rendering. These live in the composition layer (same file as the hook), NOT in shared components. Each component takes a `sourceUid` prop and reactively fetches data when it changes.

**Step 1: Add imports**

Add to existing imports:

```tsx
import { useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconLoader2 } from '@tabler/icons-react';
```

**Step 2: Add DoclingMdTab component**

Place after the data fetcher functions, before `PARSE_TABS`:

```tsx
function DoclingMdTab({ sourceUid }: { sourceUid: string | null }) {
  const [state, setState] = useState<{ title: string; markdown: string; loading: boolean } | null>(null);

  useEffect(() => {
    if (!sourceUid) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ title: '', markdown: '', loading: true });

    (async () => {
      const locator = await getArtifactLocator(sourceUid, 'markdown_bytes');
      if (cancelled) return;
      if (!locator) {
        setState({ title: '', markdown: 'No markdown available. Reset and re-parse with Docling.', loading: false });
        return;
      }
      const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(locator, 60 * 20);
      if (cancelled) return;
      if (!data?.signedUrl) {
        setState({ title: '', markdown: 'Could not generate download URL.', loading: false });
        return;
      }
      try {
        const resp = await fetch(data.signedUrl);
        if (!resp.ok) throw new Error();
        const text = await resp.text();
        if (cancelled) return;
        setState({ title: 'Docling MD', markdown: text, loading: false });
      } catch {
        if (cancelled) return;
        setState({ title: '', markdown: 'Failed to load markdown.', loading: false });
      }
    })();

    return () => { cancelled = true; };
  }, [sourceUid]);

  if (!sourceUid) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a parsed file to preview its Docling markdown.
      </div>
    );
  }

  if (!state || state.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <IconLoader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" viewportClass="h-full overflow-auto">
      <div className="parse-markdown-preview px-6 py-4">
        <Markdown remarkPlugins={[remarkGfm]}>{state.markdown}</Markdown>
      </div>
    </ScrollArea>
  );
}
```

**Step 3: Add BlocksTab component**

Place after `DoclingMdTab`:

```tsx
function BlocksTab({ sourceUid }: { sourceUid: string | null }) {
  const [state, setState] = useState<{ blocks: BlockRow[]; loading: boolean } | null>(null);

  useEffect(() => {
    if (!sourceUid) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ blocks: [], loading: true });

    (async () => {
      const blocks = await fetchBlocks(sourceUid);
      if (cancelled) return;
      setState({ blocks, loading: false });
    })();

    return () => { cancelled = true; };
  }, [sourceUid]);

  if (!sourceUid) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a parsed file to preview its blocks.
      </div>
    );
  }

  if (!state || state.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <IconLoader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.blocks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No blocks found. Reset and re-parse with Docling.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" viewportClass="h-full overflow-auto">
      <div className="divide-y divide-border">
        {state.blocks.map((b) => (
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
    </ScrollArea>
  );
}
```

**Step 4: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors (components are standalone, not yet rendered)

**Step 5: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx
git commit -m "feat: add DoclingMdTab and BlocksTab preview components"
```

---

### Task 4: Update tabs, panes, and add workbenchRef

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx` (PARSE_TABS, PARSE_DEFAULT_PANES, hook)
- Modify: `web/src/pages/ParsePage.tsx` (pass ref to Workbench)

**What changes:** Add 2 new tab definitions. Update default panes so preview pane has 3 tabs. Add `workbenchRef` to the hook and return it. Update ParsePage to pass the ref.

**Step 1: Add icon imports**

Add to the existing `@tabler/icons-react` import:

```tsx
import { IconFileCode, IconEye, IconLoader2, IconFileText, IconLayoutList } from '@tabler/icons-react';
```

(Remove duplicate `IconLoader2` if it was already added in Task 3.)

**Step 2: Add `useRef` and `WorkbenchHandle` imports**

Update the react import:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
```

Add:

```tsx
import type { WorkbenchHandle } from '@/components/workbench/Workbench';
```

**Step 3: Update PARSE_TABS**

Change from:

```tsx
export const PARSE_TABS: WorkbenchTab[] = [
  { id: 'parse', label: 'Parse', icon: IconFileCode },
  { id: 'preview', label: 'Preview', icon: IconEye },
];
```

To:

```tsx
export const PARSE_TABS: WorkbenchTab[] = [
  { id: 'parse', label: 'Parse', icon: IconFileCode },
  { id: 'docling-md', label: 'Docling MD', icon: IconFileText },
  { id: 'preview', label: 'Preview', icon: IconEye },
  { id: 'blocks', label: 'Blocks', icon: IconLayoutList },
];
```

**Step 4: Update PARSE_DEFAULT_PANES**

Change from:

```tsx
export const PARSE_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-parse', tabs: ['parse'], activeTab: 'parse', width: 44 },
  { id: 'pane-preview', tabs: ['preview'], activeTab: 'preview', width: 56 },
]);
```

To:

```tsx
export const PARSE_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-parse', tabs: ['parse'], activeTab: 'parse', width: 44 },
  { id: 'pane-preview', tabs: ['docling-md', 'preview', 'blocks'], activeTab: 'preview', width: 56 },
]);
```

**Step 5: Add workbenchRef to the hook**

Inside `useParseWorkbench()`, at the top (after `useShellHeaderTitle`), add:

```tsx
  const workbenchRef = useRef<WorkbenchHandle>(null);
```

Update the return from:

```tsx
  return { renderContent };
```

To:

```tsx
  return { renderContent, workbenchRef };
```

**Step 6: Update ParsePage.tsx to pass ref**

Read and modify `web/src/pages/ParsePage.tsx`. Change from:

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

To:

```tsx
import { Workbench } from '@/components/workbench/Workbench';
import { useParseWorkbench, PARSE_TABS, PARSE_DEFAULT_PANES } from './useParseWorkbench';

export default function ParsePage() {
  const { renderContent, workbenchRef } = useParseWorkbench();
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          ref={workbenchRef}
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

**Step 7: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors

**Step 8: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx web/src/pages/ParsePage.tsx
git commit -m "feat: add 3-tab preview pane with workbenchRef for programmatic tab switching"
```

---

### Task 5: Wire action handlers and renderContent

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx`

**What changes:** Implement the 5 action handlers. Wire them into `renderRowActions` and `ParseTabPanel`. Add `renderContent` branches for the 2 new tabs. Add `refreshDocs` to destructured state.

**Step 1: Add `refreshDocs` to destructured docState**

Change from:

```tsx
  const { docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected } = docState;
```

To:

```tsx
  const { docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, refreshDocs } = docState;
```

**Step 2: Add action handlers**

After `handleDocClick`, add:

```tsx
  const handleDoclingMdPreview = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
    workbenchRef.current?.addTab('docling-md', 'pane-preview');
  }, []);

  const handleBlocksPreview = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
    workbenchRef.current?.addTab('blocks', 'pane-preview');
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

**Step 3: Update renderRowActions**

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

**Step 4: Wire bulk Reset and Delete into ParseTabPanel**

In the `renderContent` function, change from:

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

**Step 5: Add renderContent branches for new tabs**

In the `renderContent` callback, add these branches before the existing `if (tabId === 'preview')`:

```tsx
    if (tabId === 'docling-md') {
      return <DoclingMdTab sourceUid={activeDocUid} />;
    }

    if (tabId === 'blocks') {
      return <BlocksTab sourceUid={activeDocUid} />;
    }
```

The existing `if (tabId === 'preview')` stays unchanged:

```tsx
    if (tabId === 'preview') {
      return <PreviewTabPanel doc={activeDoc} />;
    }
```

**Step 6: Update renderContent dependency array**

Add the new handlers to the useCallback deps:

```tsx
  }, [docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, activeDocUid, activeDoc, handleDocClick, renderRowActions, parseTab, handleReset, handleDelete]);
```

**Step 7: Verify compile**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors

**Step 8: Commit**

```bash
git add web/src/pages/useParseWorkbench.tsx
git commit -m "feat: wire all 5 parse actions and 3-tab preview rendering"
```

---

### Task 6: Manual smoke test

**No code changes.** Verify all 5 actions work end-to-end.

**Step 1: Start dev server**

Run: `cd web && npm run dev`

**Step 2: Navigate to Parse page**

Go to `/app/parse`, select a project with documents.

**Step 3: Verify 3-tab preview pane**

The right pane should show 3 tabs: Docling MD | Preview | Blocks. Default active tab is Preview.

**Step 4: Test each action**

1. **Parse a file** → select unparsed file, click play button or "Parse All" → wait for status to become "parsed"
2. **Docling MD Preview** → click 3-dot menu on a parsed file → "Docling MD Preview" → preview pane switches to "Docling MD" tab → shows loading spinner then rendered markdown
3. **Blocks Preview** → click 3-dot menu → "Blocks Preview" → preview pane switches to "Blocks" tab → shows block cards with type badge, index number, content text. If no blocks: "No blocks found. Reset and re-parse with Docling."
4. **Download DoclingJson** → click 3-dot menu → "Download DoclingJson" → browser opens JSON file in new tab
5. **Reset** → click 3-dot menu → "Reset" → doc status returns to "uploaded"
6. **Delete** → click 3-dot menu → "Delete" → doc removed from list
7. **Tab switching** → manually click between Docling MD / Preview / Blocks tabs → each shows its respective content for the active doc
8. **Row click** → click a different row → all tabs update to show content for the newly selected doc
9. **Toolbar bulk actions** → select multiple files → "Reset (N)" and "Delete (N)" buttons appear in toolbar and work

**Step 5: Commit (only if fixes needed)**

---

## Summary of Changes

| File | Change | Lines |
|------|--------|-------|
| `web/src/components/documents/ParseTabPanel.tsx` | Add 2 optional props to `ParseRowActions`, update menu items | ~10 lines changed |
| `web/src/pages/useParseWorkbench.tsx` | Add data fetchers, 2 tab components, action handlers, workbenchRef, tab/pane config, renderContent branches | ~160 lines added |
| `web/src/pages/ParsePage.tsx` | Destructure `workbenchRef`, pass `ref` to Workbench | ~2 lines changed |

## What is NOT Changed

- No shared component layouts or styles modified
- No new files created
- No new dependencies added (`react-markdown`, `remark-gfm`, `ScrollArea`, `@tabler/icons-react` already in use)
- No router changes
- `Workbench` component untouched — already supports multi-tab panes and `addTab` ref API
- `PreviewTabPanel` untouched — still renders source files in its own tab
- `useParseTab` untouched — `handleDownloadJson` reused as-is for action #3
- `ActionMenu` component untouched — only the items list changes
