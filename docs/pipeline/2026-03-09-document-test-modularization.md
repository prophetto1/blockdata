# DocumentTest.tsx Modularization

**Date:** 2026-03-09
**Status:** Complete (Phase 3 partial — Workbench adoption deferred)

## Problem

`web/src/pages/DocumentTest.tsx` was a 2193-line monolith containing:

- Hand-rolled multi-pane shell (splitter, tab bar, drag-drop, context menus) duplicating `Workbench.tsx`
- Inline copies of document type detection functions already in `projectDetailHelpers.ts`
- A 310-line inline copy of `PreviewTabPanel`
- A 270-line `filesTabContent` useMemo with 20+ dependencies (defeating memoization)
- File tree building, virtual folder persistence, and preview tab instance management all inlined
- Manual debounce instead of the existing `useDebouncedValue` hook

## Result

| Metric | Before | After |
|---|---|---|
| DocumentTest.tsx | 2193 lines | 1068 lines (51% reduction) |
| Type errors | 0 | 0 |
| Lint errors (new) | 0 | 0 |

## Changes Made

### Phase 1: Pure function extractions (zero behavior change)

#### 1. `web/src/lib/filesTree.ts` (new, 200 lines)

Extracted from DocumentTest:

- **Types:** `FilesTreeNode`, `MutableFolderNode`
- **Path utilities:** `normalizePath`, `joinPath`, `ensureFileExtension`, `createDefaultTextFileContents`, `getDocumentFolderPath`
- **Tree building:** `buildFilesTreeNodes` — converts flat `ProjectDocumentRow[]` into a nested tree structure with virtual folder support
- **Tree queries:** `collectFolderNodeIds`, `findFirstPreviewableSourceUid`, `findFilesTreeNodeById`

Also updated `PreviewTabPanel.tsx` to import `normalizePath` from here instead of defining its own copy.

#### 2. `web/src/lib/virtualFolders.ts` (new, 29 lines)

Extracted localStorage-backed virtual folder persistence:

- `readStoredVirtualFolders(projectId)` — reads from `blockdata.elt.virtual_folders.<projectId>`
- `writeStoredVirtualFolders(projectId, folders)` — writes normalized, deduplicated folder paths

#### 3. `web/src/lib/previewTabInstance.ts` (new, 89 lines)

Extracted preview instance tab management:

- **Constants:** `PREVIEW_INSTANCE_TAB_PREFIX`, `MAX_CONCURRENT_PREVIEW_TABS`, `NEW_PANE_TAB_PRIORITY`
- **Tab ID helpers:** `isPreviewInstanceTab`, `createPreviewInstanceTabId`, `getPreviewSourceUidFromTabId`, `getPreviewTabSequence`, `isKnownTab`
- **Pane operations:** `enforcePreviewTabCap` (evicts oldest preview tabs when over limit), `pickNewPaneTab` (selects best tab for a new split pane)

### Phase 2: Delete duplicates

#### 4. Upgraded `web/src/lib/projectDetailHelpers.ts`

Merged richer detection logic from DocumentTest's local copies:

- Added `TEXT_EXTENSIONS` set (txt, md, csv, html, xml, json, rst, tex, org, vtt)
- Added `getDocumentTitleExtension` helper
- Upgraded `isPdfDocument` to also check `doc_title` extension
- Upgraded `isTextDocument` to check `TEXT_EXTENSIONS` fallback + `startsWith('text')` + `includes('plain')`
- Exported `getExtension` (was private)

Deleted ~170 lines of local detection functions and constant sets from DocumentTest.

#### 5. Deleted inline PreviewTabPanel

Removed the 310-line inline copy of `PreviewTabPanel` from DocumentTest. The component was already extracted to `web/src/components/documents/PreviewTabPanel.tsx` — switched to importing it.

### Phase 3: Component extraction + Workbench extension

#### 6. `web/src/components/documents/AssetsPanel.tsx` (new, 486 lines)

Extracted the `filesTabContent` useMemo (270 lines, 20+ dependencies) into a proper React component with explicit props:

```ts
type AssetsPanelProps = {
  projectId: string | null;
  docs: ProjectDocumentRow[];
  docsLoading: boolean;
  docsError: string | null;
  selectedSourceUid: string | null;
  onSelectFile: (sourceUid: string) => void;
  onDeleteSelected: () => void;
  onUploadFiles: (files: FileList | null) => Promise<void>;
  onCreateEntry: (name: string, type: 'file' | 'folder') => void;
  selectedSourceUidForActions: string | null;
};
```

Internalizes state that was previously in DocumentTest:

- `filesQueryInput` + debounced `filesQuery` (now uses `useDebouncedValue` hook)
- `creatingType`, `createName` (inline file/folder creation UI)
- `expandedValue`, `selectedTreeNodeId`, `expandedInitRef` (tree view state)
- `virtualFolders` + localStorage sync effects
- `supportsDirectoryUpload` detection
- `openNativeFilePicker` callback
- `activeFolderPath` derivation
- Filtered docs, tree nodes, tree collection, folder node IDs

#### 7. Extended `web/src/components/workbench/Workbench.tsx` with `dynamicTabLabel`

Added optional prop to support tabs not in the static `tabs` array:

```ts
dynamicTabLabel?: (tabId: string) => string | null;
```

Implementation changes:

- Renamed `validTabIds` (Set) to `isValidTab` (function) throughout
- `isValidTab` checks both `staticTabIds.has(tabId)` and `dynamicTabLabel?.(tabId) != null`
- `tabLabel` falls through: static label map → `dynamicTabLabel` → raw tabId
- Updated `parseDragPayload` to join tab ID segments with `:` (supports `preview:uid:sequence` format)
- Updated `readPersistedPanes` to use the function-based validation

This enables DocumentTest's dynamic `preview:uid:n` tabs without compromising Workbench's design for other consumers like SuperuserLayout2.

#### 8. Workbench adoption — DEFERRED

Full adoption of `<Workbench>` in DocumentTest was deferred. DocumentTest has custom behaviors that require Workbench API extensions:

- **Programmatic tab insertion** — `openPreviewInRightmostPane` adds preview tabs to the last pane when files are clicked. Workbench doesn't expose `setPanes` or an imperative API.
- **Custom toolbar** — DocumentTest has a toolbar with toggle buttons and a Pull dropdown menu that differs from Workbench's toolbar pattern.
- **`moveTabToPosition`** — precise tab insertion at a specific index (Workbench only has simpler move-across-panes).
- **`enforcePreviewTabCap`** — needs to run after pane mutations.

Adopting Workbench would require adding an imperative ref API (e.g., `useImperativeHandle` exposing `addTab`, `removeTab`) or a render-props pattern for pane state access. This is a good follow-up but requires more design work.

#### 9. Cleanup

- Replaced manual debounce effect with `useDebouncedValue` hook (inside AssetsPanel)
- Removed unused imports (`IconX`, `Field`, `TreeView`, `createTreeCollection`, `ScrollArea`, `allTabIds`, `hasTab`, etc.)

## Files Changed

| File | Change |
|---|---|
| `web/src/pages/DocumentTest.tsx` | Reduced from 2193 to 1068 lines |
| `web/src/lib/filesTree.ts` | **New** — tree types and utilities |
| `web/src/lib/virtualFolders.ts` | **New** — virtual folder localStorage persistence |
| `web/src/lib/previewTabInstance.ts` | **New** — preview tab instance management |
| `web/src/components/documents/AssetsPanel.tsx` | **New** — assets panel component |
| `web/src/lib/projectDetailHelpers.ts` | Upgraded detection functions, exported `getExtension` |
| `web/src/components/documents/PreviewTabPanel.tsx` | Updated `normalizePath` import source |
| `web/src/components/workbench/Workbench.tsx` | Added `dynamicTabLabel` prop, `isValidTab` function |

## Open Items

- **Workbench adoption** — Requires imperative API design for programmatic tab insertion. Would remove ~400 more lines from DocumentTest (pane management functions + JSX shell).
- **Upload refactor** — `useUppyTransport` hook exists but was explicitly left for later.
