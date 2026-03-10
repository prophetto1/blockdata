import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Splitter } from '@ark-ui/react/splitter';
import {
  MenuContent,
  MenuItem,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu';
import {
  IconArrowsTransferDown,
  IconChevronDown,
  IconDotsVertical,
  IconDownload,
  IconEye,
  IconFileCode,
  IconFiles,
  IconLayoutColumns,
  IconTransform,
} from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import FlowCanvas from '@/components/flows/FlowCanvas';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { AssetsPanel } from '@/components/documents/AssetsPanel';
import { PreviewTabPanel } from '@/components/documents/PreviewTabPanel';
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
  isKnownTab,
  enforcePreviewTabCap,
  pickNewPaneTab,
  MAX_CONCURRENT_PREVIEW_TABS,
} from '@/lib/previewTabInstance';
import {
  FALLBACK_TAB,
  getTab,
  getTabLabel,
  getTabsByGroup,
  registerTab,
  registerTabs,
} from '@/lib/tabRegistry';
import { DltPullPanel } from '@/components/elt/DltPullPanel';
import { DltLoadPanel } from '@/components/elt/DltLoadPanel';
import { ParseEasyPanel } from '@/components/elt/ParseEasyPanel';

// --- Tab type is now a plain string; the registry is the source of truth. ---
type TabId = string;

type Pane = {
  id: string;
  tabs: TabId[];
  activeTab: TabId;
  width: number;
};

const MIN_PANE_PERCENT = 18;
const MAX_COLUMNS = 7;
const DRAG_PAYLOAD_MIME = 'application/x-doc-test-drag';
const DOCUMENTS_BUCKET = (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';

// ---------------------------------------------------------------------------
// Register tabs — view tabs are fixed; action tabs are dynamic.
// This runs once at module load. Later this will hydrate from Supabase.
// ---------------------------------------------------------------------------
registerTab({ id: 'assets', label: 'Assets', group: 'view', render: () => null }); // rendered inline
registerTab({ id: 'preview', label: 'Preview', group: 'view', render: () => null });
registerTab({ id: 'canvas', label: 'Canvas', group: 'view', render: () => null });
registerTabs('pull', [
  { suffix: 'github', label: 'GitHub', render: ({ projectId }) => <DltPullPanel projectId={projectId} scriptLabel="GitHub" /> },
  { suffix: 'stripe', label: 'Stripe', render: ({ projectId }) => <DltPullPanel projectId={projectId} scriptLabel="Stripe" /> },
  { suffix: 'sql_database', label: 'SQL Database', render: ({ projectId }) => <DltPullPanel projectId={projectId} scriptLabel="SQL Database" /> },
]);
registerTab({ id: 'load', label: 'Load', group: 'load', render: ({ projectId }) => <DltLoadPanel projectId={projectId} /> });
registerTab({ id: 'parse', label: 'Parse', group: 'parse', render: ({ projectId }) => <ParseEasyPanel projectId={projectId} /> });

type DragPayload =
  | { kind: 'tab'; fromPaneId: string; tabId: TabId }
  | { kind: 'pane'; fromIndex: number };

type PendingUpload = {
  file: File;
  relativePath?: string;
};

function resolveRouteProjectId(pathname: string): string | null {
  if (pathname.startsWith('/app/projects/list')) return null;
  const match = pathname.match(/^\/app\/elt\/([^/]+)(?:\/|$)/);
  if (!match) return null;
  return match[1] ?? null;
}

function normalizePaneWidths(input: Pane[]): Pane[] {
  if (input.length === 0) return input;
  const total = input.reduce((sum, pane) => sum + pane.width, 0);
  if (total <= 0) {
    const equal = 100 / input.length;
    return input.map((pane) => ({ ...pane, width: equal }));
  }
  return input.map((pane) => ({ ...pane, width: (pane.width / total) * 100 }));
}

function ensureAtLeastOnePane(input: Pane[]): Pane[] {
  if (input.length > 0) return input;
  return [{ id: 'pane-1', tabs: [FALLBACK_TAB], activeTab: FALLBACK_TAB, width: 100 }];
}

function withResolvedActiveTab(pane: Pane): Pane {
  if (pane.tabs.length === 0) return pane;
  if (pane.tabs.includes(pane.activeTab)) return pane;
  return { ...pane, activeTab: pane.tabs[0] };
}

function finalizePanes(input: Pane[]): Pane[] {
  const next = ensureAtLeastOnePane(
    input
      .filter((pane) => pane.tabs.length > 0)
      .map(withResolvedActiveTab),
  );
  return normalizePaneWidths(next);
}

function createPaneId(input: Pane[]): string {
  const max = input.reduce((acc, pane) => {
    const match = /^pane-(\d+)$/.exec(pane.id);
    const value = match ? Number.parseInt(match[1], 10) : 0;
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 0);
  return `pane-${max + 1}`;
}

function parseDragPayload(raw: string): DragPayload | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith('pane:')) {
    const fromIndex = Number.parseInt(value.slice('pane:'.length), 10);
    if (!Number.isFinite(fromIndex)) return null;
    return { kind: 'pane', fromIndex };
  }

  if (value.startsWith('tab:')) {
    const segments = value.split(':');
    const fromPaneId = segments[1];
    const tabIdRaw = segments.slice(2).join(':');
    if (!fromPaneId || !tabIdRaw) return null;
    if (!isKnownTab(tabIdRaw)) return null;
    return { kind: 'tab', fromPaneId, tabId: tabIdRaw };
  }

  return null;
}

function readDragPayload(dataTransfer: DataTransfer | null | undefined): DragPayload | null {
  if (!dataTransfer) return null;
  const custom = parseDragPayload(dataTransfer.getData(DRAG_PAYLOAD_MIME));
  if (custom) return custom;
  return parseDragPayload(dataTransfer.getData('text/plain'));
}

function activateTabInPane(input: Pane[], paneId: string, tabId: TabId): Pane[] {
  const stripped = input.map((pane) => {
    if (!pane.tabs.includes(tabId)) return pane;
    const tabs = pane.tabs.filter((candidate) => candidate !== tabId);
    return {
      ...pane,
      tabs,
      activeTab: tabs.includes(pane.activeTab) ? pane.activeTab : (tabs[0] ?? FALLBACK_TAB),
    };
  });

  const targetPaneId = stripped.some((pane) => pane.id === paneId)
    ? paneId
    : (stripped[0]?.id ?? paneId);

  const next = stripped.map((pane) => {
    if (pane.id !== targetPaneId) return pane;
    if (pane.tabs.includes(tabId)) return { ...pane, activeTab: tabId };
    return {
      ...pane,
      tabs: [...pane.tabs, tabId],
      activeTab: tabId,
    };
  });

  return finalizePanes(next);
}

function moveTabToPosition(input: Pane[], tabId: TabId, toPaneId: string, insertIndex: number): Pane[] {
  let sourceIndex = -1;
  let sourcePaneId: string | null = null;
  for (const pane of input) {
    const idx = pane.tabs.indexOf(tabId);
    if (idx >= 0) { sourceIndex = idx; sourcePaneId = pane.id; break; }
  }

  const stripped = input.map((pane) => {
    if (!pane.tabs.includes(tabId)) return pane;
    const tabs = pane.tabs.filter((t) => t !== tabId);
    return { ...pane, tabs, activeTab: tabs.includes(pane.activeTab) ? pane.activeTab : (tabs[0] ?? FALLBACK_TAB) };
  });

  let adjusted = insertIndex;
  if (sourcePaneId === toPaneId && sourceIndex >= 0 && sourceIndex < insertIndex) {
    adjusted = Math.max(0, insertIndex - 1);
  }

  const next = stripped.map((pane) => {
    if (pane.id !== toPaneId) return pane;
    const tabs = [...pane.tabs];
    tabs.splice(Math.min(Math.max(adjusted, 0), tabs.length), 0, tabId);
    return { ...pane, tabs, activeTab: tabId };
  });

  return finalizePanes(next);
}

function setActiveTab(input: Pane[], paneId: string, tabId: TabId): Pane[] {
  return input.map((pane) => {
    if (pane.id !== paneId) return pane;
    if (!pane.tabs.includes(tabId)) return pane;
    return { ...pane, activeTab: tabId };
  });
}

function closeTab(input: Pane[], paneId: string, tabId: TabId): Pane[] {
  const next = input.map((pane) => {
    if (pane.id !== paneId) return pane;
    const tabs = pane.tabs.filter((candidate) => candidate !== tabId);
    return {
      ...pane,
      tabs,
      activeTab: tabs.includes(pane.activeTab) ? pane.activeTab : (tabs[0] ?? FALLBACK_TAB),
    };
  });
  return finalizePanes(next);
}


/* ------------------------------------------------------------------ */
/*  ToolbarBtn — standardized toolbar button                           */
/* ------------------------------------------------------------------ */

const TOOLBAR_BTN_BASE = 'inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-semibold transition-colors';
const TOOLBAR_BTN_ACTIVE = 'border-border bg-background text-foreground';
const TOOLBAR_BTN_INACTIVE = 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground';

type ToolbarBtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  icon?: React.ReactNode;
};

const ToolbarBtn = forwardRef<HTMLButtonElement, ToolbarBtnProps>(
  function ToolbarBtn({ active, icon, children, className, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={`${TOOLBAR_BTN_BASE} ${active ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE}${className ? ` ${className}` : ''}`}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  },
);

export default function DocumentTest() {
  useShellHeaderTitle({
    title: 'Document Workbench',
  });
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

  const [panes, setPanes] = useState<Pane[]>(() => normalizePaneWidths([
    { id: 'pane-1', tabs: ['assets'], activeTab: 'assets', width: 28 },
    { id: 'pane-2', tabs: ['preview'], activeTab: 'preview', width: 72 },
  ]));
  const [focusedPaneId, setFocusedPaneId] = useState<string>('pane-1');
  const [dragOverPaneIndex, setDragOverPaneIndex] = useState<number | null>(null);
  const [tabDropTarget, setTabDropTarget] = useState<{ paneId: string; insertIndex: number } | null>(null);
  const tabDragRef = useRef<{ fromPaneId: string; tabId: TabId } | null>(null);
  const paneDragRef = useRef<{ fromIndex: number } | null>(null);

  const [pullMenuOpen, setPullMenuOpen] = useState(false);
  const pullMenuCloseTimeoutRef = useRef<number | null>(null);
  const cancelPullMenuClose = useCallback(() => {
    if (pullMenuCloseTimeoutRef.current === null) return;
    window.clearTimeout(pullMenuCloseTimeoutRef.current);
    pullMenuCloseTimeoutRef.current = null;
  }, []);
  const openPullMenu = useCallback(() => {
    cancelPullMenuClose();
    setPullMenuOpen(true);
  }, [cancelPullMenuClose]);
  const schedulePullMenuClose = useCallback(() => {
    cancelPullMenuClose();
    pullMenuCloseTimeoutRef.current = window.setTimeout(() => setPullMenuOpen(false), 160);
  }, [cancelPullMenuClose]);
  useEffect(() => () => cancelPullMenuClose(), [cancelPullMenuClose]);


  const paneLayout = useMemo(() => {
    const total = panes.reduce((sum, pane) => sum + pane.width, 0) || 100;
    return panes.map((pane) => ({
      ...pane,
      widthPercent: (pane.width / total) * 100,
    }));
  }, [panes]);

  const splitterPanels = useMemo(
    () => paneLayout.map((pane) => ({ id: pane.id, minSize: MIN_PANE_PERCENT })),
    [paneLayout],
  );

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocs();
  }, [loadDocs]);

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
            } catch {
              // Keep raw response text when JSON parsing fails.
            }
            if (!firstError) {
              firstError = `Upload failed for ${file.name}: ${message}`;
            }
          }
        } catch (error) {
          if (!firstError) {
            const message = error instanceof Error ? error.message : String(error);
            firstError = `Upload failed for ${file.name}: ${message}`;
          }
        }
      }

      await loadDocs();
      if (firstError) {
        setDocsError(firstError);
      }
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

    // Best-effort storage cleanup (RPC deletes DB rows only).
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

  const handleCreateFileEntry = useCallback(
    async (relativePath: string) => {
      const fileName = relativePath.split('/').filter((part) => part.length > 0).pop() ?? relativePath;
      const createdFile = new File([createDefaultTextFileContents(fileName)], fileName, { type: 'text/plain' });
      await uploadFiles([{ file: createdFile, relativePath }]);
    },
    [uploadFiles],
  );

  const openPreviewInRightmostPane = useCallback((sourceUid: string) => {
    const previewTabId = createPreviewInstanceTabId(sourceUid, previewTabSequenceRef.current);
    previewTabSequenceRef.current += 1;
    let nextFocusedPaneId: string | null = null;
    setPanes((current) => {
      if (current.length === 0) {
        const paneId = 'pane-1';
        nextFocusedPaneId = paneId;
        return normalizePaneWidths([
          {
            id: paneId,
            tabs: [previewTabId],
            activeTab: previewTabId,
            width: 100,
          },
        ]);
      }

      const targetIndex = current.length - 1;
      const targetPane = current[targetIndex];
      if (!targetPane) return current;
      nextFocusedPaneId = targetPane.id;

      const updated = current.map((pane, paneIndex) => {
        if (paneIndex !== targetIndex) return pane;
        return {
          ...pane,
          tabs: [...pane.tabs, previewTabId],
          activeTab: previewTabId,
        };
      });

      const capped = enforcePreviewTabCap(updated, MAX_CONCURRENT_PREVIEW_TABS);
      return normalizePaneWidths(capped);
    });
    if (nextFocusedPaneId) {
      setFocusedPaneId(nextFocusedPaneId);
    }
  }, []);

  const handleSelectFile = useCallback((sourceUid: string) => {
    setSelectedSourceUid(sourceUid);
    openPreviewInRightmostPane(sourceUid);
  }, [openPreviewInRightmostPane]);

  const renderAssetsPanel = useCallback(() => (
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
        if (type === 'folder') return; // folders handled inside AssetsPanel
        void handleCreateFileEntry(relativePath);
      }}
      selectedSourceUidForActions={selectedSourceUidForActions}
    />
  ), [projectId, docs, docsLoading, docsError, selectedSourceUid, handleSelectFile, handleDeleteSelected, handleFilesSelected, handleCreateFileEntry, selectedSourceUidForActions]);

  const canvasTabContent = useMemo(() => (
    <div className="h-full w-full min-h-0">
      <FlowCanvas />
    </div>
  ), []);

  const previewTabLabels = useMemo(() => {
    const previewTabs = Array.from(new Set(
      panes
        .flatMap((pane) => pane.tabs)
        .filter((tabId) => tabId === 'preview' || isPreviewInstanceTab(tabId)),
    ));

    previewTabs.sort((a, b) => {
      if (a === 'preview' && b !== 'preview') return -1;
      if (a !== 'preview' && b === 'preview') return 1;
      if (a === 'preview' && b === 'preview') return 0;
      return getPreviewTabSequence(a) - getPreviewTabSequence(b);
    });

    return new Map(
      previewTabs.map((tabId, index) => [tabId, index === 0 ? 'Preview' : `Preview-${index + 1}`]),
    );
  }, [panes]);

  const getTabDisplayLabel = useCallback((tabId: TabId) => {
    if (tabId === 'preview' || isPreviewInstanceTab(tabId)) {
      return previewTabLabels.get(tabId) ?? 'Preview';
    }
    return getTabLabel(tabId);
  }, [previewTabLabels]);

  const renderTabContent = (tab: TabId) => {
    // View tabs have inline-rendered content (memoized above)
    if (tab === 'assets') return renderAssetsPanel();
    if (tab === 'preview') return <PreviewTabPanel doc={selectedDoc} />;
    if (isPreviewInstanceTab(tab)) {
      const sourceUid = getPreviewSourceUidFromTabId(tab);
      const previewDoc = sourceUid ? (docsBySourceUid.get(sourceUid) ?? null) : null;
      return <PreviewTabPanel doc={previewDoc} />;
    }
    if (tab === 'canvas') return canvasTabContent;
    if (tab === 'parse') {
      return (
        <div className="h-full w-full min-h-0">
          <ParseEasyPanel projectId={projectId} selectedDocument={selectedDoc} onParseQueued={loadDocs} />
        </div>
      );
    }

    // All other tabs resolve through the registry
    const entry = getTab(tab);
    if (!entry) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Unknown tab: {tab}</div>;
    return <div className="h-full w-full min-h-0">{entry.render({ projectId })}</div>;
  };

  const handleCloseTabOrPane = (pane: Pane, tabId: TabId) => {
    if (pane.tabs.length > 1) {
      setPanes((current) => closeTab(current, pane.id, tabId));
      return;
    }

    if (panes.length <= 1) return;
    setPanes((current) => normalizePaneWidths(current.filter((candidate) => candidate.id !== pane.id)));
  };

  const removePane = useCallback((paneId: string) => {
    setPanes((current) => {
      if (current.length <= 1) return current;
      const filtered = current.filter((pane) => pane.id !== paneId);
      if (filtered.length === current.length) return current;
      return normalizePaneWidths(filtered);
    });
  }, []);

  const movePaneByOffset = useCallback((paneId: string, offset: number) => {
    setPanes((current) => {
      const fromIndex = current.findIndex((pane) => pane.id === paneId);
      if (fromIndex < 0) return current;
      const toIndex = fromIndex + offset;
      if (toIndex < 0 || toIndex >= current.length) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return current;
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const closeAllPanelsInPane = useCallback((paneId: string) => {
    setPanes((current) => current.map((pane) => {
      if (pane.id !== paneId) return pane;
      return {
        ...pane,
        tabs: [FALLBACK_TAB],
        activeTab: FALLBACK_TAB,
      };
    }));
  }, []);

  const handleSplitPane = (index: number) => {
    let nextFocusedPaneId: string | null = null;
    setPanes((current) => {
      if (current.length >= MAX_COLUMNS) return current;
      const source = current[index];
      if (!source) return current;
      const next = [...current];
      const nextTab = pickNewPaneTab(current, source.activeTab);
      nextFocusedPaneId = createPaneId(current);
      next.splice(index + 1, 0, {
        id: nextFocusedPaneId,
        tabs: [nextTab],
        activeTab: nextTab,
        width: source.width,
      });
      return normalizePaneWidths(next);
    });
    if (nextFocusedPaneId) {
      setFocusedPaneId(nextFocusedPaneId);
    }
  };

  const handlePaneDragOver = (event: React.DragEvent, paneIndex: number) => {
    // getData() is blocked during dragover (browser security), so check types array instead
    const hasOurType = event.dataTransfer.types.includes(DRAG_PAYLOAD_MIME);
    if (!hasOurType && !tabDragRef.current && !paneDragRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverPaneIndex !== paneIndex) {
      setDragOverPaneIndex(paneIndex);
    }
  };

  const handlePaneDrop = (event: React.DragEvent, paneIndex: number, paneId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverPaneIndex(null);

    // Try reading from dataTransfer first (available during drop), fall back to refs
    const payload = readDragPayload(event.dataTransfer);

    if (payload?.kind === 'pane' || (!payload && paneDragRef.current)) {
      const fromIndex = payload?.kind === 'pane' ? payload.fromIndex : paneDragRef.current!.fromIndex;
      setPanes((current) => {
        if (fromIndex < 0 || fromIndex >= current.length) return current;
        if (fromIndex === paneIndex) return current;
        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        if (!moved) return current;
        const target = Math.min(Math.max(paneIndex, 0), next.length);
        next.splice(target, 0, moved);
        return next;
      });
      paneDragRef.current = null;
      tabDragRef.current = null;
      return;
    }

    if (payload?.kind === 'tab' || (!payload && tabDragRef.current)) {
      const tabId = payload?.kind === 'tab' ? payload.tabId : tabDragRef.current!.tabId;
      setFocusedPaneId(paneId);
      if (tabDropTarget?.paneId === paneId) {
        setPanes((current) => moveTabToPosition(current, tabId, paneId, tabDropTarget.insertIndex));
      } else {
        setPanes((current) => activateTabInPane(current, paneId, tabId));
      }
      setTabDropTarget(null);
      tabDragRef.current = null;
      paneDragRef.current = null;
      return;
    }

    tabDragRef.current = null;
    paneDragRef.current = null;
  };

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">

        <ToolbarBtn
          active={panes.some((p) => p.tabs.includes('assets'))}
          icon={<IconFiles size={15} />}
          onClick={() => {
            const currentIndex = panes.findIndex((p) => p.tabs.includes('assets'));
            if (currentIndex === -1) {
              setPanes((current) => activateTabInPane(current, current[0]?.id ?? 'pane-1', 'assets'));
            } else {
              setPanes((current) => closeTab(current, current[currentIndex].id, 'assets'));
            }
          }}
        >
          Assets
        </ToolbarBtn>
        <ToolbarBtn
          active={panes.some((p) => p.tabs.some((tabId) => tabId === 'preview' || isPreviewInstanceTab(tabId)))}
          icon={<IconEye size={15} />}
          onClick={() => {
            const currentIndex = panes.findIndex((p) => p.tabs.includes('preview'));
            if (currentIndex === -1) {
              setPanes((current) => activateTabInPane(current, current[0]?.id ?? 'pane-1', 'preview'));
            } else if (currentIndex >= panes.length - 1) {
              setPanes((current) => closeTab(current, current[currentIndex].id, 'preview'));
            } else {
              const nextPaneId = panes[currentIndex + 1].id;
              setPanes((current) => activateTabInPane(current, nextPaneId, 'preview'));
            }
          }}
        >
          Preview
        </ToolbarBtn>
        <ToolbarBtn
          active={panes.some((p) => p.tabs.includes('canvas'))}
          icon={<IconLayoutColumns size={15} />}
          onClick={() => {
            const currentIndex = panes.findIndex((p) => p.tabs.includes('canvas'));
            if (currentIndex === -1) {
              setPanes((current) => activateTabInPane(current, current[current.length - 1]?.id ?? 'pane-1', 'canvas'));
            } else {
              setPanes((current) => closeTab(current, current[currentIndex].id, 'canvas'));
            }
          }}
        >
          Canvas
        </ToolbarBtn>

        <div className="mx-1 h-4 w-px bg-border" />

        <ToolbarBtn
          active={panes.some((p) => p.tabs.includes('parse') || p.tabs.some((t) => t.startsWith('parse:')))}
          icon={<IconFileCode size={15} />}
          onClick={() => {
            const currentIndex = panes.findIndex((p) => p.tabs.includes('parse'));
            if (currentIndex === -1) {
              setPanes((current) => {
                const targetPaneId = focusedPaneId ?? current[current.length - 1]?.id ?? 'pane-1';
                return activateTabInPane(current, targetPaneId, 'parse');
              });
            } else {
              setPanes((current) => closeTab(current, current[currentIndex].id, 'parse'));
            }
          }}
        >
          Parse
        </ToolbarBtn>
        <MenuRoot
          open={pullMenuOpen}
          onOpenChange={(details) => setPullMenuOpen(details.open)}
          positioning={{ placement: 'bottom-start', offset: { mainAxis: 6 } }}
        >
          <MenuTrigger asChild>
            <ToolbarBtn
              active={panes.some((p) => p.tabs.some((t) => t.startsWith('pull:')))}
              icon={<IconArrowsTransferDown size={15} />}
              onPointerEnter={openPullMenu}
              onPointerLeave={schedulePullMenuClose}
              aria-label="Open Pull (DLT)"
              title="Open Pull (DLT)"
            >
              Pull
              <IconChevronDown size={14} />
            </ToolbarBtn>
          </MenuTrigger>
          <MenuPortal>
            <MenuPositioner>
              <MenuContent onPointerEnter={openPullMenu} onPointerLeave={schedulePullMenuClose}>
                {getTabsByGroup('pull').map((entry) => (
                  <MenuItem
                    key={entry.id}
                    value={entry.id}
                    onClick={() => {
                      setPullMenuOpen(false);
                      setPanes((current) => {
                        const targetPaneId = focusedPaneId ?? current[current.length - 1]?.id ?? 'pane-1';
                        return activateTabInPane(current, targetPaneId, entry.id);
                      });
                    }}
                  >
                    {entry.label}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuPositioner>
          </MenuPortal>
        </MenuRoot>
        <ToolbarBtn
          active={panes.some((p) => p.tabs.includes('load'))}
          icon={<IconDownload size={15} />}
          onClick={() => {
            setPanes((current) => {
              const targetPaneId = focusedPaneId ?? current[current.length - 1]?.id ?? 'pane-1';
              return activateTabInPane(current, targetPaneId, 'load');
            });
          }}
          aria-label="Open Load (DLT)"
          title="Open Load (DLT)"
        >
          Load
        </ToolbarBtn>
          <ToolbarBtn active={false} icon={<IconTransform size={15} />}>
            Transform
          </ToolbarBtn>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <Splitter.Root
        className="flex min-h-0 flex-1 overflow-hidden bg-background"
        orientation="horizontal"
        panels={splitterPanels}
        size={paneLayout.map((pane) => pane.widthPercent)}
        onResize={({ size }) => {
          setPanes((current) => {
            if (!Array.isArray(size) || size.length !== current.length) return current;
            const next = current.map((pane, index) => ({
              ...pane,
              width: Number.isFinite(size[index]) ? size[index] : pane.width,
            }));
            return normalizePaneWidths(next);
          });
        }}
      >
        {paneLayout.map((pane, index) => (
          <div key={pane.id} className="contents">
            <Splitter.Panel
              id={pane.id}
              className={[
                'flex min-h-0 min-w-0 flex-col',
                dragOverPaneIndex === index ? 'ring-1 ring-primary/40' : '',
              ].join(' ')}
              onPointerDown={() => setFocusedPaneId(pane.id)}
              onDragOver={(event) => handlePaneDragOver(event, index)}
              onDragLeave={() => setDragOverPaneIndex(null)}
              onDrop={(event) => handlePaneDrop(event, index, pane.id)}
            >
              <div
                className="grid min-h-9 grid-cols-[auto_1fr_auto] border-b border-border bg-card"
              >
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    paneDragRef.current = { fromIndex: index };
                    tabDragRef.current = null;
                    event.dataTransfer.effectAllowed = 'move';
                    const payload = `pane:${index}`;
                    event.dataTransfer.setData(DRAG_PAYLOAD_MIME, payload);
                    event.dataTransfer.setData('text/plain', payload);
                  }}
                  onDragEnd={() => {
                    paneDragRef.current = null;
                    setDragOverPaneIndex(null);
                  }}
                  className="inline-flex min-h-9 w-8 items-center justify-center border-r border-border text-xs text-muted-foreground"
                  aria-label="Drag pane"
                  title="Drag pane"
                >
                  ::
                </button>
                <div
                  className="flex min-w-0 overflow-x-auto"
                  onDragOver={(event) => {
                    if (!tabDragRef.current) return;
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = 'move';
                    setTabDropTarget({ paneId: pane.id, insertIndex: pane.tabs.length });
                  }}
                  onDragLeave={() => setTabDropTarget(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const payload = readDragPayload(event.dataTransfer);
                    if (payload?.kind === 'tab' && tabDropTarget) {
                      setFocusedPaneId(tabDropTarget.paneId);
                      setPanes((current) => moveTabToPosition(current, payload.tabId, tabDropTarget.paneId, tabDropTarget.insertIndex));
                    }
                    setTabDropTarget(null);
                    setDragOverPaneIndex(null);
                    tabDragRef.current = null;
                    paneDragRef.current = null;
                  }}
                >
                  {pane.tabs.map((tab, tabIndex) => (
                    <div
                      key={`${pane.id}-${tab}`}
                      draggable
                      onDragStart={(event) => {
                        tabDragRef.current = { fromPaneId: pane.id, tabId: tab };
                        paneDragRef.current = null;
                        event.dataTransfer.effectAllowed = 'move';
                        const payload = `tab:${pane.id}:${tab}`;
                        event.dataTransfer.setData(DRAG_PAYLOAD_MIME, payload);
                        event.dataTransfer.setData('text/plain', payload);
                      }}
                      onDragEnd={() => {
                        tabDragRef.current = null;
                        setTabDropTarget(null);
                        setDragOverPaneIndex(null);
                      }}
                      onDragOver={(event) => {
                        if (!tabDragRef.current) return;
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = 'move';
                        const rect = event.currentTarget.getBoundingClientRect();
                        const midX = rect.left + rect.width / 2;
                        const insertAt = event.clientX < midX ? tabIndex : tabIndex + 1;
                        setTabDropTarget({ paneId: pane.id, insertIndex: insertAt });
                      }}
                      className={[
                        'relative inline-flex h-9 items-center gap-1 border-r border-border px-2.5 text-xs font-semibold',
                        pane.activeTab === tab ? 'bg-background text-foreground shadow-[inset_0_-2px_0_var(--primary)]' : 'text-muted-foreground',
                        tabDropTarget?.paneId === pane.id && tabDropTarget.insertIndex === tabIndex ? 'before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-primary' : '',
                        tabDropTarget?.paneId === pane.id && tabDropTarget.insertIndex === tabIndex + 1 && tabIndex === pane.tabs.length - 1 ? 'after:absolute after:right-0 after:top-1 after:bottom-1 after:w-0.5 after:bg-primary' : '',
                      ].join(' ')}
                    >
                      <button type="button" onClick={() => setPanes((current) => setActiveTab(current, pane.id, tab))} className="py-1">
                        {getTabDisplayLabel(tab)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCloseTabOrPane(pane, tab)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded hover:bg-accent"
                        aria-label={`Close ${tab}`}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 px-1">
                  {index === paneLayout.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleSplitPane(index)}
                      disabled={paneLayout.length >= MAX_COLUMNS}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border text-xs disabled:opacity-40"
                      aria-label="Split pane"
                      title="Split pane"
                    >
                      <IconLayoutColumns size={14} />
                    </button>
                  )}
                  <MenuRoot positioning={{ placement: 'bottom-end', offset: { mainAxis: 6 } }}>
                    <MenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Pane actions"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <IconDotsVertical size={14} />
                      </button>
                    </MenuTrigger>
                    <MenuPortal>
                      <MenuPositioner>
                        <MenuContent>
                          <MenuItem
                            value={`${pane.id}-move-right`}
                            onClick={() => movePaneByOffset(pane.id, 1)}
                            disabled={index >= panes.length - 1}
                          >
                            Move right
                          </MenuItem>
                          <MenuItem
                            value={`${pane.id}-move-left`}
                            onClick={() => movePaneByOffset(pane.id, -1)}
                            disabled={index <= 0}
                          >
                            Move left
                          </MenuItem>
                          <MenuItem
                            value={`${pane.id}-close-all`}
                            onClick={() => closeAllPanelsInPane(pane.id)}
                          >
                            Close all panels
                          </MenuItem>
                          <MenuItem
                            value={`${pane.id}-remove`}
                            onClick={() => removePane(pane.id)}
                            disabled={panes.length <= 1}
                          >
                            Remove pane
                          </MenuItem>
                        </MenuContent>
                      </MenuPositioner>
                    </MenuPortal>
                  </MenuRoot>
                </div>
              </div>
              <div className={[
                'flex min-h-0 flex-1 bg-card',
                isKnownTab(pane.activeTab)
                  ? ''
                  : 'items-center justify-center text-sm text-muted-foreground',
              ].join(' ')}>
                {renderTabContent(pane.activeTab)}
              </div>
            </Splitter.Panel>

            {index < paneLayout.length - 1 && (
              <Splitter.ResizeTrigger
                key={`${pane.id}-resizer`}
                id={`${pane.id}:${paneLayout[index + 1].id}`}
                className="relative w-1.5 cursor-col-resize bg-card"
                aria-label="Resize pane"
              >
                <Splitter.ResizeTriggerIndicator
                  id={`${pane.id}:${paneLayout[index + 1].id}`}
                  className="absolute bottom-0 left-0.5 top-0 w-px bg-border"
                />
              </Splitter.ResizeTrigger>
            )}
          </div>
        ))}
        </Splitter.Root>
      </div>
    </div>
  );
}
