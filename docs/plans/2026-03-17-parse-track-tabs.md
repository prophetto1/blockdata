# Parse Track Tabs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the parse page file list into two tabs (Documents / Code) so the active track drives the config column and preview pane — eliminating cross-track confusion.

**Architecture:** Add an `activeTrack` state to `useParseWorkbench` driven by a segmented control inside the file list pane (not a Workbench tab). The file list filters by track. Config and preview columns read `activeTrack` from the hook and render track-appropriate content. This avoids fighting with the Workbench's static tab/pane system and localStorage persistence.

**Tech Stack:** React, TypeScript, existing Workbench component, `parseProfileSupport.ts` utilities

---

## Current State (What Exists)

Codex already created `parseProfileSupport.ts` with:
- `getDocumentParseTrack(doc)` — determines track from `source_type` or `conv_parsing_tool`
- `getCompatibleProfiles(profiles, doc)` — filters profiles by doc's track
- `getAppliedProfileName(doc)` / `findAppliedProfile(profiles, doc)` — profile lookup for parsed files
- `CODE_SOURCE_TYPES` set — `java, py, js, jsx, ts, tsx, go, rs, cs`
- `ParseTrack` type — `'docling' | 'tree_sitter'`

Codex also modified:
- `useParseTab(selectedDoc)` — now accepts selectedDoc, filters profiles by doc track
- `ParseConfigColumn` — shows track label, filtered profiles, "Parsed with" display, error display
- `useParseWorkbench` — has `getParseWorkbenchLayout(activeDoc)` that swaps entire tab/pane sets per file

**Problem with Codex approach:** Swapping the entire Workbench tab set per file conflicts with localStorage persistence (`saveKey="parse-documents-v3"`). Old persisted panes have invalid tab IDs for the new track, so the right column falls back to `parse-compact` (File List) — producing the duplicate file list bug.

**Other call sites:** `DocumentsPage.tsx:34` also calls `useParseTab(null)`. When we change the signature, that call site must be updated too (pass `'docling'` as default track).

## Design

```
┌─────────────────────┬──────────────────┬──────────────────────────┐
│ [Documents] [Code]  │ Config           │ Preview                  │
│                     │ ─────────        │ ─────────                │
│ segmented control   │ track label      │ tab 1: Markdown | AST    │
│ ↓ filters file list │ profile dropdown │ tab 2: Blocks | Symbols  │
│                     │ (filtered)       │ tab 3: Downloads         │
│ file table          │ batch actions    │                          │
│ (one track only)    │ (filtered)       │ (content adapts)         │
└─────────────────────┴──────────────────┴──────────────────────────┘
```

**Key rule:** `activeTrack` is a single state variable. Everything downstream reads it. No per-file track switching.

**Unsupported files:** Files like `renovate.json`, `LICENSE`, `lefthook.yml` etc. have no supported parser (not Docling-routable, not in `CODE_SOURCE_TYPES`). These fall into the Documents tab by default. The parse button is disabled for them, and the status column shows "No parser" instead of "unparsed". No third tab — that just adds UI for files you can't act on.

**localStorage reset:** Changing saveKey from `v3` to `v4` wipes any user-customized column widths. One-time UX hiccup, necessary because the old layout has stale tab IDs.

---

### Task 1: Add utilities to parseProfileSupport.ts

**Files:**
- Modify: `web/src/components/documents/parseProfileSupport.ts`

**Step 1: Add `filterDocsByTrack`**

```typescript
export function filterDocsByTrack(
  docs: ProjectDocumentRow[],
  track: ParseTrack,
): ProjectDocumentRow[] {
  return docs.filter((doc) => getDocumentParseTrack(doc) === track);
}
```

**Step 2: Add `isParseSupported`**

```typescript
const DOCLING_SOURCE_TYPES = new Set([
  'md', 'docx', 'pdf', 'pptx', 'xlsx', 'html', 'csv', 'txt',
  'rst', 'latex', 'odt', 'epub', 'rtf', 'org', 'asciidoc', 'vtt',
]);

export function isParseSupported(doc: Pick<ProjectDocumentRow, 'source_type'>): boolean {
  return CODE_SOURCE_TYPES.has(doc.source_type) || DOCLING_SOURCE_TYPES.has(doc.source_type);
}
```

**Step 3: Commit**

```
feat: add filterDocsByTrack and isParseSupported utilities
```

---

### Task 2: Add `activeTrack` state to useParseWorkbench

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx`

**Step 1: Add `activeTrack` state**

In `useParseWorkbench()`, add after `activeDocUid` state:

```typescript
const [activeTrack, setActiveTrack] = useState<ParseTrack>('docling');
```

**Step 2: Derive filtered docs and counts**

```typescript
const trackDocs = useMemo(
  () => filterDocsByTrack(docs, activeTrack),
  [docs, activeTrack],
);
const doclingDocs = useMemo(() => filterDocsByTrack(docs, 'docling'), [docs]);
const codeDocs = useMemo(() => filterDocsByTrack(docs, 'tree_sitter'), [docs]);
```

**Step 3: Clear activeDocUid when switching tracks**

When `activeTrack` changes, the previously selected doc may not be in the new track's list.

```typescript
useEffect(() => {
  if (activeDocUid) {
    const stillValid = trackDocs.some((d) => d.source_uid === activeDocUid);
    if (!stillValid) setActiveDocUid(null);
  }
}, [activeTrack, trackDocs, activeDocUid]);
```

**Step 4: Commit**

```
feat: add activeTrack state and doc filtering to parse workbench
```

---

### Task 3: Render track switcher in file list pane

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx` (the `renderContent` callback, `parse-compact` branch)

**Step 1: Build TrackSwitcher component**

Add above the `useParseWorkbench` function:

```typescript
function TrackSwitcher({
  activeTrack,
  onTrackChange,
  doclingCount,
  codeCount,
}: {
  activeTrack: ParseTrack;
  onTrackChange: (track: ParseTrack) => void;
  doclingCount: number;
  codeCount: number;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
      <button
        type="button"
        onClick={() => onTrackChange('docling')}
        className={cn(
          'rounded-md px-3 py-1 text-xs font-medium transition-colors',
          activeTrack === 'docling'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        Documents ({doclingCount})
      </button>
      <button
        type="button"
        onClick={() => onTrackChange('tree_sitter')}
        className={cn(
          'rounded-md px-3 py-1 text-xs font-medium transition-colors',
          activeTrack === 'tree_sitter'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        Code ({codeCount})
      </button>
    </div>
  );
}
```

**Step 2: Wire into renderContent**

In the `parse-compact` branch of `renderContent`, add `TrackSwitcher` above the `DocumentFileTable`. Pass `trackDocs` instead of `docs` to the file table:

```tsx
<TrackSwitcher
  activeTrack={activeTrack}
  onTrackChange={setActiveTrack}
  doclingCount={doclingDocs.length}
  codeCount={codeDocs.length}
/>
<DocumentFileTable
  docs={trackDocs}  // ← filtered, not all docs
  // ... rest unchanged
/>
```

**Step 3: Commit**

```
feat: track switcher in parse file list pane
```

---

### Task 4: Wire useParseTab to activeTrack

**Files:**
- Modify: `web/src/components/documents/ParseTabPanel.tsx`
- Modify: `web/src/pages/useParseWorkbench.tsx`
- Modify: `web/src/pages/DocumentsPage.tsx`

**Step 1: Change useParseTab signature**

Currently: `useParseTab(selectedDoc: ProjectDocumentRow | null)`
Change to: `useParseTab(activeTrack: ParseTrack, selectedDoc: ProjectDocumentRow | null)`

The `activeTrack` determines which profiles are shown and which parser the batch uses. The `selectedDoc` is still needed for the "applied profile" lookup on parsed files.

**Step 2: Filter profiles by activeTrack, not selectedDoc**

In `useParseTab`, change the `profiles` memo:

```typescript
const profiles = useMemo(
  () => allProfiles.filter((p) => p.parser === activeTrack),
  [allProfiles, activeTrack],
);
```

And the `selectedParser` memo:

```typescript
const selectedParser = useMemo(() => {
  const profile = allProfiles.find((p) => p.id === selectedProfileId);
  return profile?.parser ?? activeTrack;
}, [allProfiles, activeTrack, selectedProfileId]);
```

**Step 3: Return activeTrack from hook for downstream use**

```typescript
return {
  profiles,
  selectedProfileId,
  selectedParser,
  activeTrack,  // pass through
  handleProfileChange,
  batch,
  // ...rest
};
```

**Step 4: Update call site in useParseWorkbench**

```typescript
const parseTab = useParseTab(activeTrack, activeDoc);
```

**Step 5: Update call site in DocumentsPage.tsx**

`DocumentsPage.tsx:34` currently has `useParseTab(null)`. Change to:

```typescript
const parseTab = useParseTab('docling', null);
```

DocumentsPage is a document-centric page — it always uses the docling track.

**Step 6: Commit**

```
refactor: useParseTab driven by activeTrack, not per-file detection
```

---

### Task 5: Wire config column to activeTrack

**Files:**
- Modify: `web/src/components/documents/ParseConfigColumn.tsx`

**Step 1: Use parseTab.activeTrack for header**

Replace `const visibleTrack = getDocumentParseTrack(selectedDoc)` with:

```typescript
const visibleTrack = parseTab.activeTrack;
```

**Step 2: Remove redundant profile filtering**

Delete `const visibleProfiles = getCompatibleProfiles(profiles, selectedDoc)` — profiles are already filtered by `useParseTab`. Use `profiles` directly everywhere `visibleProfiles` was used.

**Step 3: Add `trackDocs` prop for progress bar**

Add a new prop `trackDocs: ProjectDocumentRow[]` to `ParseConfigColumnProps`. The progress bar denominator should use `trackDocs.length` (files in the active track), not `docs.length` (all files).

Update the progress bar:

```typescript
const parsedCount = trackDocs.filter((doc) => doc.status === 'parsed').length;
const convertingCount = trackDocs.filter((doc) => doc.status === 'converting').length;
const parseProgress = trackDocs.length > 0 ? (parsedCount / trackDocs.length) * 100 : 0;
```

Update the progress text:

```typescript
{parsedCount}/{trackDocs.length} parsed
```

**Step 4: Keep batch UIDs using full `docs` list**

The `unparsedUids` and `selectedUids` filters still use the `docs` prop (all files), filtered by `getDocumentParseTrack(doc) === batchParser`. This ensures "Parse All" dispatches all compatible files across both tracks.

**Step 5: Update call site in useParseWorkbench**

Pass `trackDocs` to `ParseConfigColumn`:

```tsx
<ParseConfigColumn
  docs={docs}
  trackDocs={trackDocs}
  selected={selected}
  selectedDoc={activeDoc}
  parseTab={parseTab}
  onReset={...}
  onDelete={...}
/>
```

**Step 6: Commit**

```
fix: config column driven by activeTrack from parseTab
```

---

### Task 6: Wire isParseSupported into ParseRowActions

**Files:**
- Modify: `web/src/components/documents/ParseTabPanel.tsx`

**Step 1: Import isParseSupported**

```typescript
import {
  findAppliedProfile,
  getCompatibleProfiles,
  getDocumentParseTrack,
  isParseSupported,
  type ParsingProfileOption,
} from './parseProfileSupport';
```

**Step 2: Update canParse logic in ParseRowActions**

Currently:

```typescript
const canParse =
  doc.status === 'uploaded' ||
  doc.status === 'conversion_failed' ||
  doc.status === 'parse_failed';
```

Change to:

```typescript
const parseable = isParseSupported(doc);
const canParse = parseable && (
  doc.status === 'uploaded' ||
  doc.status === 'conversion_failed' ||
  doc.status === 'parse_failed'
);
```

**Step 3: Update the play button tooltip**

```tsx
{canParse && (
  <button
    // ...existing props
    title="Parse this file"
  >
    <IconPlayerPlay size={12} />
  </button>
)}
{!parseable && doc.status === 'uploaded' && (
  <span
    className="flex h-5 w-5 items-center justify-center text-muted-foreground/50"
    title="No parser available for this file type"
  >
    <IconPlayerPlay size={12} />
  </span>
)}
```

**Step 4: Commit**

```
feat: disable parse button for unsupported file types
```

---

### Task 7a: Unify tab/pane layout — replace dual sets

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx`

**Step 1: Replace dual tab sets with one unified set**

Delete: `PARSE_TABS` (old), `TREE_SITTER_TABS`, `PARSE_DEFAULT_PANES` (old), `TREE_SITTER_DEFAULT_PANES`, `getParseWorkbenchLayout`.

Replace with:

```typescript
export const PARSE_TABS: WorkbenchTab[] = [
  { id: 'parse-compact', label: 'File List', icon: IconFileCode },
  { id: 'config', label: 'Parse Config', icon: IconSettings },
  { id: 'parse-settings', label: 'Parse Settings', icon: IconSettings },
  { id: 'preview-main', label: 'Preview', icon: IconFileText },
  { id: 'preview-detail', label: 'Detail', icon: IconLayoutList },
  { id: 'preview-downloads', label: 'Downloads', icon: IconDownload },
];

export const PARSE_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-parse', tabs: ['parse-compact'], activeTab: 'parse-compact', width: 32 },
  { id: 'pane-config', tabs: ['config', 'parse-settings'], activeTab: 'config', width: 24 },
  { id: 'pane-preview', tabs: ['preview-main', 'preview-detail', 'preview-downloads'], activeTab: 'preview-main', width: 44 },
]);
```

**Step 2: Update saveKey to bust old localStorage**

In `ParsePage.tsx`:

```typescript
saveKey="parse-documents-v4"
```

**Step 3: Delete the layout memo**

Delete:

```typescript
const layout = useMemo(() => getParseWorkbenchLayout(activeDoc), [activeDoc]);
```

Change the hook return from `{ tabs: layout.tabs, defaultPanes: layout.defaultPanes }` to `{ tabs: PARSE_TABS, defaultPanes: PARSE_DEFAULT_PANES }`.

**Step 4: Commit**

```
refactor: unified parse tab/pane layout, remove dual sets
```

---

### Task 7b: Unify tab/pane layout — renderContent and dynamicTabLabel

**Files:**
- Modify: `web/src/pages/useParseWorkbench.tsx`

**Step 1: Update renderContent for generic preview tab IDs**

Replace the old tab-specific branches (`docling-md`, `blocks`, `docling-json`, `ts-ast`, `ts-symbols`, `ts-downloads`) with:

```typescript
if (tabId === 'preview-main') {
  return activeTrack === 'tree_sitter'
    ? <TreeSitterAstTab doc={activeDoc} artifacts={activeArtifacts} />
    : <DoclingMdTab doc={activeDoc} artifacts={activeArtifacts} />;
}

if (tabId === 'preview-detail') {
  return activeTrack === 'tree_sitter'
    ? <TreeSitterSymbolsTab doc={activeDoc} artifacts={activeArtifacts} />
    : <BlocksTab doc={activeDoc} artifacts={activeArtifacts} />;
}

if (tabId === 'preview-downloads') {
  return activeTrack === 'tree_sitter'
    ? <TreeSitterDownloadsTab doc={activeDoc} artifacts={activeArtifacts} />
    : <DownloadsTab doc={activeDoc} artifacts={activeArtifacts} />;
}
```

**Step 2: Add `dynamicTabLabel` callback**

The Workbench component already supports a `dynamicTabLabel` prop (confirmed in `Workbench.tsx:184`). Use it so the preview tab headers show track-appropriate names:

```typescript
const dynamicTabLabel = useCallback((tabId: string): string | null => {
  if (tabId === 'preview-main') return activeTrack === 'tree_sitter' ? 'AST' : 'Parsed Markdown';
  if (tabId === 'preview-detail') return activeTrack === 'tree_sitter' ? 'Symbols' : 'Parsed Blocks';
  if (tabId === 'preview-downloads') return 'Downloads';
  return null;
}, [activeTrack]);
```

Return `dynamicTabLabel` from the hook and pass it to `<Workbench>` in `ParsePage.tsx`.

**Step 3: Remove `lockLayout` prop if set**

The unified layout doesn't need forced locking.

**Step 4: Commit**

```
feat: track-adaptive preview content and dynamic tab labels
```

---

### Task 8: Update tests

**Files:**
- Modify: `web/src/pages/useParseWorkbench.test.tsx`
- Modify: `web/src/pages/useParseWorkbench.layout.test.tsx`
- Modify: `web/src/components/documents/ParseConfigColumn.test.tsx`

**Step 1: Update layout tests**

`useParseWorkbench.layout.test.tsx` currently tests `getParseWorkbenchLayout`. Delete those tests. Add:

```typescript
test('PARSE_TABS has unified tab IDs', () => {
  const ids = PARSE_TABS.map(t => t.id);
  expect(ids).toContain('parse-compact');
  expect(ids).toContain('preview-main');
  expect(ids).toContain('preview-detail');
  expect(ids).toContain('preview-downloads');
});
```

**Step 2: Update ParseConfigColumn tests**

Config column now reads `parseTab.activeTrack` — update mocks to provide `activeTrack` in the `parseTab` mock.

**Step 3: Add filterDocsByTrack and isParseSupported tests**

```typescript
import { filterDocsByTrack, isParseSupported } from '@/components/documents/parseProfileSupport';

test('filterDocsByTrack separates code and document files', () => {
  const docs = [
    { source_type: 'py', conv_parsing_tool: null },
    { source_type: 'pdf', conv_parsing_tool: null },
    { source_type: 'tsx', conv_parsing_tool: null },
  ] as ProjectDocumentRow[];

  expect(filterDocsByTrack(docs, 'tree_sitter')).toHaveLength(2);
  expect(filterDocsByTrack(docs, 'docling')).toHaveLength(1);
});

test('isParseSupported returns false for unknown types', () => {
  expect(isParseSupported({ source_type: 'binary' })).toBe(false);
  expect(isParseSupported({ source_type: 'json' })).toBe(false);
});

test('isParseSupported returns true for known types', () => {
  expect(isParseSupported({ source_type: 'py' })).toBe(true);
  expect(isParseSupported({ source_type: 'pdf' })).toBe(true);
});
```

**Step 4: Run tests**

```bash
cd web && npx vitest run --reporter=verbose
```

**Step 5: Commit**

```
test: update parse workbench tests for unified track-tab layout
```

---

## Summary of changes

| File | Change |
|------|--------|
| `parseProfileSupport.ts` | Add `filterDocsByTrack()`, `isParseSupported()` |
| `useParseWorkbench.tsx` | `activeTrack` state, `TrackSwitcher` component, unified tabs/panes, generic preview IDs, `dynamicTabLabel` |
| `ParseTabPanel.tsx` | `useParseTab(activeTrack, selectedDoc)` — profiles filtered by track arg; `isParseSupported` check in `ParseRowActions` |
| `ParseConfigColumn.tsx` | Read `parseTab.activeTrack`, add `trackDocs` prop for progress bar |
| `ParsePage.tsx` | Pass `dynamicTabLabel`, update `saveKey` to `v4` |
| `DocumentsPage.tsx` | Update `useParseTab(null)` → `useParseTab('docling', null)` |
| Tests | Update layout, config, profile filtering, and isParseSupported tests |

**Not changed:** `useBatchParse.ts`, `parseArtifacts.ts`, tree-sitter tab components, docling tab components — all stay as-is.
