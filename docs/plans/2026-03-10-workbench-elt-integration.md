# Workbench + ELT Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace DocumentTest's ad-hoc 500-line pane/tab/drag system with the existing Workbench component, extending Workbench with the features ELT needs.

**Architecture:** Add an imperative ref API (`WorkbenchHandle`) to Workbench so consumers can programmatically add/remove/toggle tabs. DocumentTest renders its own toolbar via `hideToolbar=true` and delegates all pane management to Workbench. ELT-specific logic (docs, uploads, parsing, preview instances) stays in DocumentTest via a `useEltWorkbench` hook, mirroring the `useWorkspaceEditor` pattern used by superuser layouts.

**Tech Stack:** React, TypeScript, Ark UI Splitter, existing Workbench component + workbenchState.ts

---

## Context: Key Files

| File | Role |
|---|---|
| `web/src/components/workbench/Workbench.tsx` | Generic multi-pane workbench (712 lines) |
| `web/src/components/workbench/workbenchState.ts` | Pure pane state functions |
| `web/src/pages/DocumentTest.tsx` | ELT page (1068 lines) — the file being refactored |
| `web/src/pages/superuser/useWorkspaceEditor.tsx` | Reference pattern for Workbench consumption |
| `web/src/lib/previewTabInstance.ts` | Preview tab ID helpers, cap enforcement |
| `web/src/lib/tabRegistry.ts` | Tab registry (assets, preview, canvas, parse, pull, load) |
| `web/src/components/documents/PreviewTabPanel.tsx` | Preview renderer for all doc formats |
| `web/src/components/documents/AssetsPanel.tsx` | File tree panel |
| `web/src/components/elt/ParseEasyPanel.tsx` | Parse configuration panel |
| `web/src/components/elt/DltPullPanel.tsx` | Pull panel |
| `web/src/components/elt/DltLoadPanel.tsx` | Load panel |

## Gap Analysis: What Workbench Lacks

DocumentTest has these features that Workbench currently doesn't support:

1. **Programmatic tab insertion** — `openPreviewInRightmostPane` adds a dynamic `preview:sourceUid:seq` tab when a file is clicked in the assets panel. Workbench has no external API for this.
2. **Tab toggle from toolbar** — clicking Assets/Preview/Canvas in DocumentTest toggles the tab on/off. Workbench's `openPanelFromToolbar` only opens/focuses.
3. **Dynamic preview instance tabs** — tabs like `preview:abc123:1` are created on-the-fly. Workbench already has `dynamicTabLabel` prop for labeling these, but no way to add them externally.
4. **Preview tab cap** — max 8 concurrent preview tabs, oldest evicted. Needs to run after any tab insertion.
5. **Custom toolbar with dropdown** — Pull button opens a dropdown menu (GitHub, Stripe, SQL Database). Workbench toolbar is a flat button list.
6. **Reading pane state** — DocumentTest needs to know which panes exist and what tabs are open (for toolbar active states, finding rightmost pane, etc.).

---

## Task 1: Add `WorkbenchHandle` imperative ref API

**Files:**
- Modify: `web/src/components/workbench/Workbench.tsx`
- Modify: `web/src/components/workbench/workbenchState.ts`

**What this adds:** A `React.forwardRef` + `useImperativeHandle` on Workbench exposing:

```typescript
export type WorkbenchHandle = {
  /** Add a tab to a specific pane (or rightmost pane if no paneId). Activates it. */
  addTab: (tabId: string, paneId?: string) => void;
  /** Remove a tab from whichever pane contains it. */
  removeTab: (tabId: string) => void;
  /** Toggle a tab: if open anywhere, remove it; if not, add to target pane. */
  toggleTab: (tabId: string, paneId?: string) => void;
  /** Get current pane state snapshot (readonly). */
  getPanes: () => readonly Pane[];
  /** Get the focused pane ID. */
  getFocusedPaneId: () => string | null;
};
```

**Step 1: Add `removeTabFromAll` to workbenchState.ts**

This is a new pure function needed for toggle/remove operations:

```typescript
export function removeTabFromAll(input: Pane[], tabId: string, fallbackTab: string): Pane[] {
  const next = input.map((pane) => {
    if (!pane.tabs.includes(tabId)) return pane;
    const nextTabs = pane.tabs.filter((tab) => tab !== tabId);
    const nextActive = nextTabs.includes(pane.activeTab)
      ? pane.activeTab
      : (nextTabs[0] ?? fallbackTab);
    return { ...pane, tabs: nextTabs, activeTab: nextActive };
  });
  return finalizeStructure(input, next, fallbackTab);
}
```

Note: `finalizeStructure` is currently not exported. Export it.

**Step 2: Add `onPanesChange` callback prop to Workbench**

Add to `WorkbenchProps`:

```typescript
export type WorkbenchProps = {
  // ... existing props ...
  /** Called whenever panes change. Useful for external state sync or enforcement (e.g. preview tab cap). */
  onPanesChange?: (panes: readonly Pane[]) => void;
  /** Ref for imperative API. */
  ref?: React.Ref<WorkbenchHandle>;
};
```

**Step 3: Convert Workbench to forwardRef + useImperativeHandle**

Change the component signature:

```typescript
export const Workbench = forwardRef<WorkbenchHandle, WorkbenchProps>(
  function Workbench({ tabs, defaultPanes, saveKey, renderContent, toolbarActions, hideToolbar = false, dynamicTabLabel, onPanesChange }, ref) {
    // ... existing body ...

    // Fire onPanesChange whenever panes update
    useEffect(() => {
      onPanesChange?.(panes);
    }, [panes, onPanesChange]);

    useImperativeHandle(ref, () => ({
      addTab(tabId: string, paneId?: string) {
        const targetPaneId = paneId
          ?? focusedPaneId
          ?? panes[panes.length - 1]?.id;
        if (!targetPaneId) return;
        setFocusedPaneId(targetPaneId);
        setPanes((current) => activateTabInPane(current, targetPaneId, tabId, fallbackTab));
      },
      removeTab(tabId: string) {
        setPanes((current) => removeTabFromAll(current, tabId, fallbackTab));
      },
      toggleTab(tabId: string, paneId?: string) {
        const isOpen = panes.some((p) => p.tabs.includes(tabId));
        if (isOpen) {
          setPanes((current) => removeTabFromAll(current, tabId, fallbackTab));
        } else {
          const targetPaneId = paneId
            ?? focusedPaneId
            ?? panes[panes.length - 1]?.id;
          if (!targetPaneId) return;
          setFocusedPaneId(targetPaneId);
          setPanes((current) => activateTabInPane(current, targetPaneId, tabId, fallbackTab));
        }
      },
      getPanes() {
        return panes;
      },
      getFocusedPaneId() {
        return focusedPaneId;
      },
    }), [panes, focusedPaneId, fallbackTab]);

    // ... rest unchanged ...
  }
);
```

**Step 4: Verify superuser layouts still work**

Run: `cd /home/jon/BD2/web && npx tsc --noEmit`
Expected: No type errors. SuperuserLayout1/2/3 don't use ref, so they're unaffected.

**Step 5: Commit**

```bash
git add web/src/components/workbench/Workbench.tsx web/src/components/workbench/workbenchState.ts
git commit -m "feat: add WorkbenchHandle imperative ref API to Workbench"
```

---

## Task 2: Create `useEltWorkbench` hook

**Files:**
- Create: `web/src/pages/useEltWorkbench.tsx`

**Purpose:** Mirrors the `useWorkspaceEditor` pattern. Encapsulates all ELT-specific state (docs, uploads, selected file, preview instances) and provides a `renderContent` callback for Workbench. Also manages the imperative ref interactions.

**Step 1: Create the hook file**

```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { WorkbenchHandle } from '@/components/workbench/Workbench';
import type { Pane } from '@/components/workbench/workbenchState';
import { normalizePaneWidths } from '@/components/workbench/workbenchState';
import { AssetsPanel } from '@/components/documents/AssetsPanel';
import { PreviewTabPanel } from '@/components/documents/PreviewTabPanel';
import FlowCanvas from '@/components/flows/FlowCanvas';
import { DltPullPanel } from '@/components/elt/DltPullPanel';
import { DltLoadPanel } from '@/components/elt/DltLoadPanel';
import { ParseEasyPanel } from '@/components/elt/ParseEasyPanel';
import { edgeFetch } from '@/lib/edge';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
import { readFocusedProjectId } from '@/lib/projectFocus';
import {
  type ProjectDocumentRow,
  sortDocumentsByUploadedAt,
} from '@/lib/projectDetailHelpers';
import { supabase } from '@/lib/supabase';
import { createDefaultTextFileContents } from '@/lib/filesTree';
import {
  isPreviewInstanceTab,
  createPreviewInstanceTabId,
  getPreviewSourceUidFromTabId,
  getPreviewTabSequence,
  enforcePreviewTabCap,
  MAX_CONCURRENT_PREVIEW_TABS,
} from '@/lib/previewTabInstance';
import {
  getTab,
  getTabLabel,
  registerTab,
  registerTabs,
} from '@/lib/tabRegistry';
import {
  IconArrowsTransferDown,
  IconDownload,
  IconEye,
  IconFileCode,
  IconFiles,
  IconLayoutColumns,
  IconTransform,
} from '@tabler/icons-react';
import type { WorkbenchTab } from '@/components/workbench/Workbench';

// ─── Tab registration (runs once at module load) ─────────────────────────────

registerTab({ id: 'assets', label: 'Assets', group: 'view', render: () => null });
registerTab({ id: 'preview', label: 'Preview', group: 'view', render: () => null });
registerTab({ id: 'canvas', label: 'Canvas', group: 'view', render: () => null });
registerTabs('pull', [
  { suffix: 'github', label: 'GitHub', render: ({ projectId }) => <DltPullPanel projectId={projectId} scriptLabel="GitHub" /> },
  { suffix: 'stripe', label: 'Stripe', render: ({ projectId }) => <DltPullPanel projectId={projectId} scriptLabel="Stripe" /> },
  { suffix: 'sql_database', label: 'SQL Database', render: ({ projectId }) => <DltPullPanel projectId={projectId} scriptLabel="SQL Database" /> },
]);
registerTab({ id: 'load', label: 'Load', group: 'load', render: ({ projectId }) => <DltLoadPanel projectId={projectId} /> });
registerTab({ id: 'parse', label: 'Parse', group: 'parse', render: ({ projectId }) => <ParseEasyPanel projectId={projectId} /> });

// ─── Constants ───────────────────────────────────────────────────────────────

const DOCUMENTS_BUCKET = (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';

export const ELT_TABS: WorkbenchTab[] = [
  { id: 'assets', label: 'Assets', icon: IconFiles },
  { id: 'preview', label: 'Preview', icon: IconEye },
  { id: 'canvas', label: 'Canvas', icon: IconLayoutColumns },
  { id: 'parse', label: 'Parse', icon: IconFileCode },
  { id: 'load', label: 'Load', icon: IconDownload },
];

export const ELT_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['assets'], activeTab: 'assets', width: 28 },
  { id: 'pane-2', tabs: ['preview'], activeTab: 'preview', width: 72 },
]);

type PendingUpload = {
  file: File;
  relativePath?: string;
};

// ─── Route helper ────────────────────────────────────────────────────────────

function resolveRouteProjectId(pathname: string): string | null {
  if (pathname.startsWith('/app/projects/list')) return null;
  const match = pathname.match(/^\/app\/elt\/([^/]+)(?:\/|$)/);
  if (!match) return null;
  return match[1] ?? null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useEltWorkbench(workbenchRef: React.RefObject<WorkbenchHandle | null>) {
  const location = useLocation();
  const routeProjectId = useMemo(
    () => resolveRouteProjectId(location.pathname),
    [location.pathname],
  );
  const focusedProjectId = readFocusedProjectId();
  const projectId = routeProjectId ?? focusedProjectId;

  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [selectedSourceUid, setSelectedSourceUid] = useState<string | null>(null);
  const previewTabSequenceRef = useRef(1);

  // ── Doc loading ──────────────────────────────────────────────────────────

  const loadDocs = useCallback(async () => {
    if (!projectId) {
      setDocs([]);
      setDocsError(null);
      setDocsLoading(false);
      return;
    }
    setDocsLoading(true);
    setDocsError(null);
    try {
      const data = await fetchAllProjectDocuments<ProjectDocumentRow>({
        projectId,
        select: '*',
      });
      setDocs(sortDocumentsByUploadedAt(data));
      setDocsLoading(false);
    } catch (error) {
      setDocs([]);
      setDocsError(error instanceof Error ? error.message : String(error));
      setDocsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  // ── Upload ───────────────────────────────────────────────────────────────

  const uploadFiles = useCallback(
    async (pending: readonly PendingUpload[]) => {
      if (!projectId || pending.length === 0) return;
      setDocsError(null);
      let firstError: string | null = null;

      for (const item of pending) {
        const file = item.file;
        const relativePath = item.relativePath?.trim()
          ?? (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim()
          ?? '';
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('project_id', projectId);
        formData.append('ingest_mode', 'upload_only');
        if (relativePath.length > 0) {
          formData.append('doc_title', relativePath);
        }
        try {
          const response = await edgeFetch('ingest', { method: 'POST', body: formData });
          const text = await response.text();
          if (!response.ok) {
            let message = text || `HTTP ${response.status}`;
            try {
              const parsed = JSON.parse(text) as { error?: string };
              if (typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
                message = parsed.error.trim();
              }
            } catch { /* keep raw */ }
            if (!firstError) firstError = `Upload failed for ${file.name}: ${message}`;
          }
        } catch (error) {
          if (!firstError) {
            firstError = `Upload failed for ${file.name}: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      }
      await loadDocs();
      if (firstError) setDocsError(firstError);
    },
    [projectId, loadDocs],
  );

  const handleFilesSelected = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      await uploadFiles(Array.from(files).map((file) => ({ file })));
    },
    [uploadFiles],
  );

  // ── Selection ────────────────────────────────────────────────────────────

  const resolvedSelectedSourceUid = useMemo(() => {
    if (selectedSourceUid && docs.some((doc) => doc.source_uid === selectedSourceUid)) {
      return selectedSourceUid;
    }
    return docs[0]?.source_uid ?? null;
  }, [selectedSourceUid, docs]);

  const selectedSourceUidForActions = useMemo(() => {
    if (selectedSourceUid && docs.some((doc) => doc.source_uid === selectedSourceUid)) {
      return selectedSourceUid;
    }
    return null;
  }, [docs, selectedSourceUid]);

  const selectedDoc = useMemo(
    () => docs.find((doc) => doc.source_uid === resolvedSelectedSourceUid) ?? null,
    [resolvedSelectedSourceUid, docs],
  );

  const docsBySourceUid = useMemo(
    () => new Map(docs.map((doc) => [doc.source_uid, doc])),
    [docs],
  );

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedSourceUidForActions || !projectId) return;
    const doc = docs.find((d) => d.source_uid === selectedSourceUidForActions);
    if (!doc) return;
    setDocsError(null);

    const { error: deleteError } = await supabase.rpc('delete_document', { p_source_uid: doc.source_uid });
    if (deleteError) {
      setDocsError(deleteError.message);
      return;
    }

    const locator = doc.source_locator?.replace(/^\/+/, '');
    if (locator) {
      const { error: storageError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([locator]);
      if (storageError) {
        setDocsError(`Deleted record, but failed to remove file: ${storageError.message}`);
      }
    }

    setSelectedSourceUid(null);
    await loadDocs();
  }, [selectedSourceUidForActions, projectId, docs, loadDocs]);

  // ── Create file ──────────────────────────────────────────────────────────

  const handleCreateFileEntry = useCallback(
    async (relativePath: string) => {
      const fileName = relativePath.split('/').filter((part) => part.length > 0).pop() ?? relativePath;
      const createdFile = new File([createDefaultTextFileContents(fileName)], fileName, { type: 'text/plain' });
      await uploadFiles([{ file: createdFile, relativePath }]);
    },
    [uploadFiles],
  );

  // ── Preview instance management ──────────────────────────────────────────

  const openPreviewForFile = useCallback((sourceUid: string) => {
    const handle = workbenchRef.current;
    if (!handle) return;

    const previewTabId = createPreviewInstanceTabId(sourceUid, previewTabSequenceRef.current);
    previewTabSequenceRef.current += 1;

    // Add to rightmost pane
    const currentPanes = handle.getPanes();
    const rightmostPaneId = currentPanes.length > 0
      ? currentPanes[currentPanes.length - 1].id
      : undefined;
    handle.addTab(previewTabId, rightmostPaneId);
  }, [workbenchRef]);

  const handleSelectFile = useCallback((sourceUid: string) => {
    setSelectedSourceUid(sourceUid);
    openPreviewForFile(sourceUid);
  }, [openPreviewForFile]);

  // ── Preview tab cap enforcement ──────────────────────────────────────────

  const handlePanesChange = useCallback((panes: readonly Pane[]) => {
    // Count preview instance tabs; if over cap, the Workbench will be updated
    // via the ref. We check synchronously to avoid loops.
    const previewCount = panes
      .flatMap((p) => p.tabs)
      .filter(isPreviewInstanceTab)
      .length;

    if (previewCount > MAX_CONCURRENT_PREVIEW_TABS) {
      // enforcePreviewTabCap is a pure function that returns capped panes.
      // We need to set panes on the workbench — but we can't from onPanesChange
      // without risking a loop. Instead, we handle this inside addTab.
      // This callback is kept for future use (e.g. analytics, persistence).
    }
  }, []);

  // ── Dynamic tab label ────────────────────────────────────────────────────

  const dynamicTabLabel = useCallback((tabId: string): string | null => {
    if (isPreviewInstanceTab(tabId)) {
      const sourceUid = getPreviewSourceUidFromTabId(tabId);
      if (!sourceUid) return 'Preview';
      const doc = docsBySourceUid.get(sourceUid);
      if (doc) {
        const name = doc.doc_title.split('/').pop() ?? doc.doc_title;
        return name.length > 20 ? `${name.slice(0, 18)}...` : name;
      }
      return 'Preview';
    }
    // Also handle registered tabs that aren't in the static ELT_TABS
    const entry = getTab(tabId);
    if (entry) return entry.label;
    return null;
  }, [docsBySourceUid]);

  // ── Render content ───────────────────────────────────────────────────────

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'assets') {
      return (
        <AssetsPanel
          projectId={projectId}
          docs={docs}
          docsLoading={docsLoading}
          docsError={docsError}
          selectedSourceUid={selectedSourceUid}
          onSelectFile={handleSelectFile}
          onDeleteSelected={handleDeleteSelected}
          onUploadFiles={handleFilesSelected}
          onCreateEntry={(relativePath, type) => {
            if (type === 'folder') return;
            void handleCreateFileEntry(relativePath);
          }}
          selectedSourceUidForActions={selectedSourceUidForActions}
        />
      );
    }

    if (tabId === 'preview') {
      return <PreviewTabPanel doc={selectedDoc} />;
    }

    if (isPreviewInstanceTab(tabId)) {
      const sourceUid = getPreviewSourceUidFromTabId(tabId);
      const previewDoc = sourceUid ? (docsBySourceUid.get(sourceUid) ?? null) : null;
      return <PreviewTabPanel doc={previewDoc} />;
    }

    if (tabId === 'canvas') {
      return <div className="h-full w-full min-h-0"><FlowCanvas /></div>;
    }

    if (tabId === 'parse') {
      return (
        <div className="h-full w-full min-h-0">
          <ParseEasyPanel projectId={projectId} selectedDocument={selectedDoc} onParseQueued={loadDocs} />
        </div>
      );
    }

    // Registry fallback (pull:*, load, etc.)
    const entry = getTab(tabId);
    if (entry) {
      return <div className="h-full w-full min-h-0">{entry.render({ projectId })}</div>;
    }

    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Unknown tab: {tabId}
      </div>
    );
  }, [projectId, docs, docsLoading, docsError, selectedSourceUid, selectedDoc, docsBySourceUid, handleSelectFile, handleDeleteSelected, handleFilesSelected, handleCreateFileEntry, selectedSourceUidForActions, loadDocs]);

  return {
    projectId,
    renderContent,
    dynamicTabLabel,
    handlePanesChange,
  };
}
```

**Step 2: Verify types compile**

Run: `cd /home/jon/BD2/web && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add web/src/pages/useEltWorkbench.tsx
git commit -m "feat: extract useEltWorkbench hook for Workbench consumption"
```

---

## Task 3: Add preview tab cap enforcement to Workbench

**Files:**
- Modify: `web/src/components/workbench/Workbench.tsx`

**Problem:** When `addTab` inserts a preview instance tab, the total preview instance count may exceed `MAX_CONCURRENT_PREVIEW_TABS`. We need a hook point for consumers to transform panes after mutations.

**Solution:** Add an optional `transformPanes` prop — a pure function that runs after every pane mutation, allowing consumers to enforce caps or other invariants.

**Step 1: Add the prop**

```typescript
export type WorkbenchProps = {
  // ... existing ...
  /** Pure transform applied after every pane mutation. Use for enforcing invariants like tab caps. */
  transformPanes?: (panes: Pane[]) => Pane[];
};
```

**Step 2: Wrap setPanes**

Inside Workbench, create a wrapper:

```typescript
const updatePanes = useCallback((updater: Pane[] | ((current: Pane[]) => Pane[])) => {
  setPanes((current) => {
    const next = typeof updater === 'function' ? updater(current) : updater;
    return transformPanes ? transformPanes(next) : next;
  });
}, [transformPanes]);
```

Replace all `setPanes(...)` calls in Workbench with `updatePanes(...)`.

**Step 3: In useEltWorkbench, provide the transform**

```typescript
const transformPanes = useCallback((panes: Pane[]): Pane[] => {
  return enforcePreviewTabCap(panes, MAX_CONCURRENT_PREVIEW_TABS);
}, []);
```

Return it from the hook and pass it to `<Workbench transformPanes={transformPanes} />`.

**Step 4: Verify types compile**

Run: `cd /home/jon/BD2/web && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add web/src/components/workbench/Workbench.tsx
git commit -m "feat: add transformPanes prop to Workbench for invariant enforcement"
```

---

## Task 4: Rewrite DocumentTest to use Workbench

**Files:**
- Modify: `web/src/pages/DocumentTest.tsx` (rewrite — goes from ~1068 lines to ~120)

**Step 1: Replace the entire file content**

```typescript
import { useRef } from 'react';
import {
  IconArrowsTransferDown,
  IconChevronDown,
  IconTransform,
} from '@tabler/icons-react';
import {
  MenuContent,
  MenuItem,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu';
import { Workbench, type WorkbenchHandle } from '@/components/workbench/Workbench';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { getTabsByGroup } from '@/lib/tabRegistry';
import {
  useEltWorkbench,
  ELT_TABS,
  ELT_DEFAULT_PANES,
} from './useEltWorkbench';

export default function DocumentTest() {
  useShellHeaderTitle({ title: 'Document Workbench' });

  const workbenchRef = useRef<WorkbenchHandle>(null);
  const {
    renderContent,
    dynamicTabLabel,
    transformPanes,
  } = useEltWorkbench(workbenchRef);

  const pullTabs = getTabsByGroup('pull');

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] flex-col overflow-hidden">
      {/* ELT-specific toolbar */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
        {ELT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="workbench-panel-button"
            onClick={() => workbenchRef.current?.toggleTab(tab.id)}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}

        <div className="mx-1 h-4 w-px bg-border" />

        <MenuRoot positioning={{ placement: 'bottom-start', offset: { mainAxis: 6 } }}>
          <MenuTrigger asChild>
            <button
              type="button"
              className="workbench-panel-button"
              aria-label="Open Pull (DLT)"
            >
              <IconArrowsTransferDown size={15} />
              Pull
              <IconChevronDown size={14} />
            </button>
          </MenuTrigger>
          <MenuPortal>
            <MenuPositioner>
              <MenuContent>
                {pullTabs.map((entry) => (
                  <MenuItem
                    key={entry.id}
                    value={entry.id}
                    onClick={() => workbenchRef.current?.addTab(entry.id)}
                  >
                    {entry.label}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuPositioner>
          </MenuPortal>
        </MenuRoot>

        <button type="button" className="workbench-panel-button" disabled>
          <IconTransform size={15} />
          Transform
        </button>
      </div>

      {/* Workbench handles all pane/tab/drag management */}
      <div className="flex min-h-0 flex-1 flex-col">
        <Workbench
          ref={workbenchRef}
          tabs={ELT_TABS}
          defaultPanes={ELT_DEFAULT_PANES}
          saveKey="elt-document-workbench"
          renderContent={renderContent}
          dynamicTabLabel={dynamicTabLabel}
          transformPanes={transformPanes}
          hideToolbar
        />
      </div>
    </div>
  );
}
```

**Important notes:**
- The `saveKey` changes from implicit (DocumentTest managed its own state) to `"elt-document-workbench"` for localStorage. Users' existing layout will reset once — acceptable.
- The toolbar uses `workbench-panel-button` CSS class from Workbench.css for consistent styling.
- The Pull dropdown and Transform placeholder remain as custom toolbar elements.
- All pane management (drag, split, resize, tab close) is handled by Workbench internally.

**Step 2: Verify types compile**

Run: `cd /home/jon/BD2/web && npx tsc --noEmit`

**Step 3: Manual smoke test**

Run: `cd /home/jon/BD2/web && npm run dev`

Verify:
- [ ] Assets panel shows with file tree
- [ ] Clicking a file opens a preview instance tab in rightmost pane
- [ ] Parse, Pull (dropdown), Load buttons work
- [ ] Tab drag-and-drop works
- [ ] Pane split/close/resize works
- [ ] Preview tab cap (max 8) is enforced

**Step 4: Commit**

```bash
git add web/src/pages/DocumentTest.tsx
git commit -m "refactor: rewrite DocumentTest to use Workbench component"
```

---

## Task 5: Cleanup — remove dead code

**Files:**
- Possibly modify: `web/src/lib/tabRegistry.ts` — check if DocumentTest was the only consumer of certain exports
- Possibly modify: `web/src/lib/previewTabInstance.ts` — check if `pickNewPaneTab`, `isKnownTab` are still needed

**Step 1: Search for unused exports**

Run grep for each function from previewTabInstance.ts and tabRegistry.ts to see if they're still imported anywhere after the refactor.

Functions to check:
- `pickNewPaneTab` — was used in DocumentTest's `handleSplitPane`. Now Workbench has its own split logic. Likely unused.
- `isKnownTab` — was used in DocumentTest for drag validation. Workbench uses `isValidTab` from its own `dynamicTabLabel`. Likely unused.
- `NEW_PANE_TAB_PRIORITY` — only used by `pickNewPaneTab`. Likely unused.
- `FALLBACK_TAB` from tabRegistry — still used by previewTabInstance.ts internally.
- `registerTab`, `registerTabs` — still used by useEltWorkbench.tsx.

**Step 2: Remove unused exports**

If grep confirms they're unused, remove them from previewTabInstance.ts.

**Step 3: Verify types compile**

Run: `cd /home/jon/BD2/web && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add -u
git commit -m "chore: remove dead code after Workbench integration"
```

---

## Task 6: Toolbar active state indicators

**Files:**
- Modify: `web/src/pages/DocumentTest.tsx`
- Modify: `web/src/pages/useEltWorkbench.tsx`

**Problem:** The original DocumentTest toolbar buttons showed active state when their tab was open in any pane. The rewritten toolbar in Task 4 uses plain `workbench-panel-button` without active states.

**Step 1: Expose open tab set from the hook**

In `useEltWorkbench`, add state tracking via `onPanesChange`:

```typescript
const [openTabIds, setOpenTabIds] = useState<ReadonlySet<string>>(new Set());

const handlePanesChange = useCallback((panes: readonly Pane[]) => {
  const ids = new Set<string>();
  panes.forEach((p) => p.tabs.forEach((t) => ids.add(t)));
  setOpenTabIds(ids);
}, []);
```

Return `openTabIds` from the hook.

**Step 2: Apply active class in DocumentTest toolbar**

```typescript
<button
  key={tab.id}
  type="button"
  className={`workbench-panel-button${openTabIds.has(tab.id) ? ' is-open' : ''}`}
  onClick={() => workbenchRef.current?.toggleTab(tab.id)}
>
```

For Pull button, check if any pull tab is open:

```typescript
const isPullOpen = pullTabs.some((entry) => openTabIds.has(entry.id));
```

**Step 3: Commit**

```bash
git add web/src/pages/DocumentTest.tsx web/src/pages/useEltWorkbench.tsx
git commit -m "feat: add toolbar active state indicators to ELT workbench"
```

---

## Summary

| Task | What | Lines removed | Lines added |
|---|---|---|---|
| 1 | WorkbenchHandle ref API | 0 | ~50 |
| 2 | useEltWorkbench hook | 0 | ~280 |
| 3 | transformPanes prop | 0 | ~20 |
| 4 | Rewrite DocumentTest | ~1000 | ~120 |
| 5 | Dead code cleanup | ~20 | 0 |
| 6 | Toolbar active states | 0 | ~20 |

**Net effect:** ~1000 lines removed from DocumentTest, ~370 added across hook + Workbench extensions. DocumentTest goes from 1068 lines to ~120. All pane/tab/drag logic is shared with superuser layouts.
