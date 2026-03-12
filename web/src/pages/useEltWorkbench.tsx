import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  IconArrowsTransferDown,
  IconDownload,
  IconEye,
  IconFileCode,
  IconFiles,
  IconLayoutColumns,
} from '@tabler/icons-react';
import type { WorkbenchHandle, WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
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
  enforcePreviewTabCap,
  MAX_CONCURRENT_PREVIEW_TABS,
} from '@/lib/previewTabInstance';
import {
  getTab,
  registerTab,
  registerTabs,
} from '@/lib/tabRegistry';

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

export const ELT_PULL_TABS: WorkbenchTab[] = [
  { id: 'pull:github', label: 'GitHub', icon: IconArrowsTransferDown },
  { id: 'pull:stripe', label: 'Stripe', icon: IconArrowsTransferDown },
  { id: 'pull:sql_database', label: 'SQL Database', icon: IconArrowsTransferDown },
];

export const ELT_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['assets'], activeTab: 'assets', width: 20, minWidth: 20, maxTabs: 3 },
  { id: 'pane-2', tabs: ['preview'], activeTab: 'preview', width: 50 },
  { id: 'pane-3', tabs: ['parse'], activeTab: 'parse', width: 30 },
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
  const [openTabIds, setOpenTabIds] = useState<ReadonlySet<string>>(new Set());
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

  // ── transformPanes: enforce preview tab cap ──────────────────────────────

  const transformPanes = useCallback((panes: Pane[]): Pane[] => {
    let result = enforcePreviewTabCap(panes, MAX_CONCURRENT_PREVIEW_TABS);

    // Invariant: 'assets' must always be in the first pane
    const firstPane = result[0];
    if (firstPane && !firstPane.tabs.includes('assets')) {
      // Remove 'assets' from any other pane
      result = result.map((pane, i) => {
        if (i === 0) return pane;
        if (!pane.tabs.includes('assets')) return pane;
        const nextTabs = pane.tabs.filter((t) => t !== 'assets');
        return {
          ...pane,
          tabs: nextTabs,
          activeTab: nextTabs.includes(pane.activeTab) ? pane.activeTab : (nextTabs[0] ?? 'preview'),
        };
      });
      // Add 'assets' to the first pane
      result = result.map((pane, i) => {
        if (i !== 0) return pane;
        return { ...pane, tabs: ['assets', ...pane.tabs], activeTab: pane.activeTab || 'assets' };
      });
    } else if (firstPane?.tabs.includes('assets')) {
      // Remove 'assets' from any pane other than the first
      result = result.map((pane, i) => {
        if (i === 0) return pane;
        if (!pane.tabs.includes('assets')) return pane;
        const nextTabs = pane.tabs.filter((t) => t !== 'assets');
        return {
          ...pane,
          tabs: nextTabs,
          activeTab: nextTabs.includes(pane.activeTab) ? pane.activeTab : (nextTabs[0] ?? 'preview'),
        };
      });
    }

    // Remove empty panes (except first) that lost all tabs
    result = result.filter((pane, i) => i === 0 || pane.tabs.length > 0);

    return result;
  }, []);

  // ── onPanesChange: track open tabs for toolbar active states ─────────────

  const handlePanesChange = useCallback((panes: readonly Pane[]) => {
    const ids = new Set<string>();
    for (const pane of panes) {
      for (const tabId of pane.tabs) {
        ids.add(tabId);
      }
    }
    setOpenTabIds(ids);
  }, []);

  // ── Dynamic tab label ────────────────────────────────────────────────────

  const dynamicTabLabel = useCallback((tabId: string): string | null => {
    if (isPreviewInstanceTab(tabId)) {
      const sourceUid = getPreviewSourceUidFromTabId(tabId);
      if (!sourceUid) return 'Preview';
      const doc = docsBySourceUid.get(sourceUid);
      if (doc) {
        const name = doc.doc_title.split('/').pop() ?? doc.doc_title;
        return name.length > 20 ? `${name.slice(0, 18)}\u2026` : name;
      }
      return 'Preview';
    }
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
    openTabIds,
    renderContent,
    dynamicTabLabel,
    transformPanes,
    handlePanesChange,
  };
}
