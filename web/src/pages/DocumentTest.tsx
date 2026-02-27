import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Field } from '@ark-ui/react/field';
import { Splitter } from '@ark-ui/react/splitter';
import { TreeView, createTreeCollection } from '@ark-ui/react/tree-view';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MenuContent,
  MenuItem,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu';
import {
  IconDotsVertical,
  IconDownload,
  IconEye,
  IconFilePlus,
  IconFiles,
  IconFileText,
  IconFolder,
  IconFolderPlus,
  IconLayoutColumns,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import FlowCanvas from '@/components/flows/FlowCanvas';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { DocxPreview } from '@/components/documents/DocxPreview';
import { PdfPreview } from '@/components/documents/PdfPreview';
import { PptxPreview } from '@/components/documents/PptxPreview';
import { edgeFetch } from '@/lib/edge';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import {
  type ProjectDocumentRow,
  formatBytes,
  getDocumentFormat,
  sortDocumentsByUploadedAt,
} from '@/lib/projectDetailHelpers';
import { supabase } from '@/lib/supabase';
import {
  FALLBACK_TAB,
  getTab,
  getTabLabel,
  getTabsByGroup,
  hasTab,
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
const VIRTUAL_FOLDERS_STORAGE_KEY_PREFIX = 'blockdata.elt.virtual_folders.';

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
registerTab({ id: 'parse:easy', label: 'Parse: Easy', group: 'parse', render: ({ projectId }) => <ParseEasyPanel projectId={projectId} /> });

const TEXT_SOURCE_TYPES = new Set([
  'md',
  'txt',
  'csv',
  'html',
  'asciidoc',
  'xml_uspto',
  'xml_jats',
  'json_docling',
  'rst',
  'latex',
  'org',
  'vtt',
]);
const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'csv',
  'html',
  'xml',
  'json',
  'rst',
  'tex',
  'org',
  'vtt',
]);
const IMAGE_SOURCE_TYPES = new Set(['image']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'tif', 'tiff']);
const DOCX_SOURCE_TYPES = new Set(['docx', 'docm', 'dotx', 'dotm']);
const DOCX_EXTENSIONS = new Set(['docx', 'docm', 'dotx', 'dotm']);
const PPTX_SOURCE_TYPES = new Set(['pptx', 'pptm', 'ppsx']);
const PPTX_EXTENSIONS = new Set(['pptx', 'pptm', 'ppsx']);

type PreviewKind = 'none' | 'pdf' | 'image' | 'text' | 'markdown' | 'docx' | 'pptx' | 'file';

type DragPayload =
  | { kind: 'tab'; fromPaneId: string; tabId: TabId }
  | { kind: 'pane'; fromIndex: number };

type SignedUrlResult = {
  url: string | null;
  error: string | null;
};

type PendingUpload = {
  file: File;
  relativePath?: string;
};

type FilesTreeNode = {
  id: string;
  label: string;
  kind: 'folder' | 'file';
  sourceUid?: string;
  doc?: ProjectDocumentRow;
  children?: FilesTreeNode[];
};

type MutableFolderNode = {
  id: string;
  label: string;
  folders: Map<string, MutableFolderNode>;
  files: FilesTreeNode[];
};

function normalizePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join('/');
}

function joinPath(prefix: string, segment: string): string {
  const normalizedPrefix = normalizePath(prefix);
  const normalizedSegment = normalizePath(segment);
  if (!normalizedPrefix) return normalizedSegment;
  if (!normalizedSegment) return normalizedPrefix;
  return `${normalizedPrefix}/${normalizedSegment}`;
}

function ensureFileExtension(path: string, fallbackExtension = '.txt'): string {
  const parts = normalizePath(path).split('/').filter((part) => part.length > 0);
  if (parts.length === 0) return '';
  const fileName = parts[parts.length - 1] ?? '';
  if (fileName.includes('.')) return parts.join('/');
  parts[parts.length - 1] = `${fileName}${fallbackExtension}`;
  return parts.join('/');
}

function createDefaultTextFileContents(fileName: string): string {
  const timestamp = new Date().toISOString();
  return `# ${fileName}\n\nCreated ${timestamp}\n`;
}

function getDocumentFolderPath(doc: ProjectDocumentRow | null | undefined): string {
  if (!doc) return '';
  const titleParts = normalizePath(doc.doc_title ?? '').split('/').filter((part) => part.length > 0);
  if (titleParts.length > 1) {
    return titleParts.slice(0, -1).join('/');
  }
  return '';
}

function readStoredVirtualFolders(projectId: string | null): string[] {
  if (typeof window === 'undefined' || !projectId) return [];
  try {
    const raw = window.localStorage.getItem(`${VIRTUAL_FOLDERS_STORAGE_KEY_PREFIX}${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === 'string' ? normalizePath(item) : ''))
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

function writeStoredVirtualFolders(projectId: string | null, folders: string[]) {
  if (typeof window === 'undefined' || !projectId) return;
  const normalized = folders
    .map((folder) => normalizePath(folder))
    .filter((folder, index, input) => folder.length > 0 && input.indexOf(folder) === index);
  window.localStorage.setItem(
    `${VIRTUAL_FOLDERS_STORAGE_KEY_PREFIX}${projectId}`,
    JSON.stringify(normalized),
  );
}

function buildFilesTreeNodes(docs: ProjectDocumentRow[], extraFolders: string[] = []): FilesTreeNode[] {
  const root: MutableFolderNode = {
    id: 'root',
    label: '',
    folders: new Map<string, MutableFolderNode>(),
    files: [],
  };

  for (const doc of docs) {
    const titlePathParts = normalizePath(doc.doc_title ?? '').split('/').filter((part) => part.length > 0);
    const locatorPathParts = normalizePath(doc.source_locator ?? '').split('/').filter((part) => part.length > 0);
    const locatorName = locatorPathParts[locatorPathParts.length - 1] ?? doc.source_uid;
    const fallbackName = (doc.doc_title ?? '').trim() || locatorName || doc.source_uid;
    const displayPathParts = titlePathParts.length > 0 ? titlePathParts : [fallbackName];

    const folderParts = displayPathParts.length > 1 ? displayPathParts.slice(0, -1) : [];
    const fileLabel = displayPathParts[displayPathParts.length - 1] ?? fallbackName;

    let currentFolder = root;
    let folderPath = '';
    for (const part of folderParts) {
      folderPath = folderPath ? `${folderPath}/${part}` : part;
      let nextFolder = currentFolder.folders.get(part);
      if (!nextFolder) {
        nextFolder = {
          id: `folder:${folderPath}`,
          label: part,
          folders: new Map<string, MutableFolderNode>(),
          files: [],
        };
        currentFolder.folders.set(part, nextFolder);
      }
      currentFolder = nextFolder;
    }

    currentFolder.files.push({
      id: `doc:${doc.source_uid}`,
      label: fileLabel,
      kind: 'file',
      sourceUid: doc.source_uid,
      doc,
    });
  }

  for (const folderPath of extraFolders) {
    const parts = folderPath.split('/').filter((p) => p.length > 0);
    let current = root;
    let accumulated = '';
    for (const part of parts) {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      let next = current.folders.get(part);
      if (!next) {
        next = {
          id: `folder:${accumulated}`,
          label: part,
          folders: new Map<string, MutableFolderNode>(),
          files: [],
        };
        current.folders.set(part, next);
      }
      current = next;
    }
  }

  const sortByLabel = (a: { label: string }, b: { label: string }) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true });

  const toNodes = (folder: MutableFolderNode): FilesTreeNode[] => {
    const folderNodes = Array.from(folder.folders.values())
      .sort(sortByLabel)
      .map((childFolder) => ({
        id: childFolder.id,
        label: childFolder.label,
        kind: 'folder' as const,
        children: toNodes(childFolder),
      }));
    // Keep file insertion order from docs input (already sorted newest-first).
    const fileNodes = folder.files.map((file) => ({ ...file }));
    return [...folderNodes, ...fileNodes];
  };

  return toNodes(root);
}

function collectFolderNodeIds(nodes: FilesTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (input: FilesTreeNode[]) => {
    for (const node of input) {
      if (node.kind !== 'folder') continue;
      ids.push(node.id);
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return ids;
}

function findFirstPreviewableSourceUid(node: FilesTreeNode | null | undefined): string | null {
  if (!node) return null;
  if (node.kind === 'file') return node.sourceUid ?? null;

  const children = node.children ?? [];
  for (const child of children) {
    if (child.kind !== 'file') continue;
    if (child.sourceUid) return child.sourceUid;
  }
  for (const child of children) {
    if (child.kind !== 'folder') continue;
    const nested = findFirstPreviewableSourceUid(child);
    if (nested) return nested;
  }
  return null;
}

function findFilesTreeNodeById(nodes: FilesTreeNode[], id: string): FilesTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const nested = findFilesTreeNodeById(node.children, id);
      if (nested) return nested;
    }
  }
  return null;
}

function getExtension(name: string): string {
  const index = name.lastIndexOf('.');
  if (index < 0 || index === name.length - 1) return '';
  return name.slice(index + 1).toLowerCase();
}

function getSourceLocatorExtension(doc: ProjectDocumentRow): string {
  return getExtension(doc.source_locator ?? '');
}

function getDocumentTitleExtension(doc: ProjectDocumentRow): string {
  return getExtension(doc.doc_title ?? '');
}

function isPdfDocument(doc: ProjectDocumentRow): boolean {
  if (doc.source_type.toLowerCase() === 'pdf') return true;
  if (getSourceLocatorExtension(doc) === 'pdf') return true;
  return getDocumentTitleExtension(doc) === 'pdf';
}

function isImageDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (IMAGE_SOURCE_TYPES.has(sourceType)) return true;
  return IMAGE_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

function isTextDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (TEXT_SOURCE_TYPES.has(sourceType)) return true;
  if (sourceType.startsWith('text') || sourceType.includes('plain')) return true;
  return TEXT_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

function isMarkdownDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (sourceType === 'md' || sourceType === 'markdown' || sourceType === 'mdx') return true;
  const extension = getSourceLocatorExtension(doc);
  return extension === 'md' || extension === 'markdown' || extension === 'mdx';
}

function isDocxDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (DOCX_SOURCE_TYPES.has(sourceType)) return true;
  return DOCX_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

function isPptxDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (PPTX_SOURCE_TYPES.has(sourceType)) return true;
  return PPTX_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

async function createSignedUrlForLocator(locator: string | null | undefined): Promise<SignedUrlResult> {
  const normalized = locator?.trim();
  if (!normalized) {
    return { url: null, error: 'No file locator was found.' };
  }

  const sourceKey = normalized.replace(/^\/+/, '');
  const { data, error: signedUrlError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(sourceKey, 60 * 20);

  if (signedUrlError) {
    return { url: null, error: signedUrlError.message };
  }
  if (!data?.signedUrl) {
    return { url: null, error: 'Storage did not return a signed URL.' };
  }
  return { url: data.signedUrl, error: null };
}

async function resolveSignedUrlForLocators(locators: Array<string | null | undefined>): Promise<SignedUrlResult> {
  const errors: string[] = [];
  for (const locator of locators) {
    if (!locator?.trim()) continue;
    const result = await createSignedUrlForLocator(locator);
    if (result.url) return result;
    if (result.error) errors.push(result.error);
  }

  return {
    url: null,
    error: errors[0] ?? 'No previewable file was available for this document.',
  };
}

function resolveRouteProjectId(pathname: string): string | null {
  if (pathname.startsWith('/app/projects/list')) return null;
  const match = pathname.match(/^\/app\/elt\/([^/]+)(?:\/|$)/);
  if (!match) return null;
  return match[1] ?? null;
}

function readFocusedProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PROJECT_FOCUS_STORAGE_KEY);
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === 'string' && parsed.trim().length > 0) {
      return parsed.trim();
    }
  } catch {
    // Fall through to plain value.
  }
  return trimmed.replace(/^"+|"+$/g, '') || null;
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
    if (!hasTab(tabIdRaw)) return null;
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

export default function DocumentTest() {
  useShellHeaderTitle({
    title: 'Document Workbench',
    subtitle: 'Ark Splitter + column tabs',
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
  const [filesQuery, setFilesQuery] = useState('');
  const [selectedSourceUid, setSelectedSourceUid] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<PreviewKind>('none');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [panes, setPanes] = useState<Pane[]>(() => normalizePaneWidths([
    { id: 'pane-1', tabs: ['assets'], activeTab: 'assets', width: 50 },
    { id: 'pane-2', tabs: ['preview'], activeTab: 'preview', width: 50 },
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

  const supportsDirectoryUpload = useMemo(() => {
    if (typeof document === 'undefined') return false;
    const input = document.createElement('input') as HTMLInputElement & { webkitdirectory?: string };
    return 'webkitdirectory' in input;
  }, []);
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [createName, setCreateName] = useState('');
  const [virtualFolders, setVirtualFolders] = useState<string[]>([]);
  const [expandedValue, setExpandedValue] = useState<string[]>([]);
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string | null>(null);
  const expandedInitRef = useRef(false);

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

  const openNativeFilePicker = useCallback((mode: 'file' | 'folder') => {
    const tryOpen = (input: HTMLInputElement | null): boolean => {
      if (!input) return false;
      try {
        const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
        if (typeof pickerInput.showPicker === 'function') {
          pickerInput.showPicker();
        } else {
          input.click();
        }
        return true;
      } catch {
        return false;
      }
    };

    const transientInput = document.createElement('input');
    transientInput.type = 'file';
    transientInput.multiple = true;
    if (mode === 'folder') {
      (transientInput as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory = true;
    }
    transientInput.className = 'sr-only';
    transientInput.onchange = () => {
      void handleFilesSelected(transientInput.files);
      transientInput.remove();
    };
    document.body.appendChild(transientInput);
    tryOpen(transientInput);
  }, [handleFilesSelected]);

  const activeFolderPath = useMemo(() => {
    if (selectedTreeNodeId?.startsWith('folder:')) {
      return normalizePath(selectedTreeNodeId.slice('folder:'.length));
    }
    const selectedDocSourceUid = selectedTreeNodeId?.startsWith('doc:')
      ? selectedTreeNodeId.slice('doc:'.length)
      : selectedSourceUid;
    if (!selectedDocSourceUid) return '';
    const selectedDocRow = docs.find((doc) => doc.source_uid === selectedDocSourceUid);
    return getDocumentFolderPath(selectedDocRow);
  }, [docs, selectedSourceUid, selectedTreeNodeId]);

  const handleCreateEntry = useCallback(
    async (name: string, type: 'file' | 'folder') => {
      if (!name.trim() || !projectId) return;
      const trimmed = normalizePath(name);
      const selectedFolderPath = activeFolderPath;
      if (!trimmed) return;

      if (type === 'folder') {
        const targetFolderPath = joinPath(selectedFolderPath, trimmed);
        if (!targetFolderPath) return;
        setVirtualFolders((prev) => prev.includes(targetFolderPath) ? prev : [...prev, targetFolderPath]);
        setCreatingType(null);
        setCreateName('');
        return;
      }

      const normalizedName = ensureFileExtension(trimmed);
      const targetRelativePath = joinPath(selectedFolderPath, normalizedName);
      if (!targetRelativePath) return;
      const fileName = targetRelativePath.split('/').filter((part) => part.length > 0).pop() ?? targetRelativePath;

      setCreatingType(null);
      setCreateName('');
      const createdFile = new File([createDefaultTextFileContents(fileName)], fileName, { type: 'text/plain' });
      await uploadFiles([{ file: createdFile, relativePath: targetRelativePath }]);
    },
    [activeFolderPath, projectId, uploadFiles],
  );

  const resolvedSelectedSourceUid = useMemo(() => {
    if (selectedSourceUid && docs.some((doc) => doc.source_uid === selectedSourceUid)) {
      return selectedSourceUid;
    }
    return docs[0]?.source_uid ?? null;
  }, [selectedSourceUid, docs]);

  const selectedSourceUidForActions = useMemo(() => {
    if (selectedTreeNodeId?.startsWith('doc:')) {
      const sourceUid = selectedTreeNodeId.slice('doc:'.length);
      return docs.some((doc) => doc.source_uid === sourceUid) ? sourceUid : null;
    }
    if (selectedSourceUid && docs.some((doc) => doc.source_uid === selectedSourceUid)) {
      return selectedSourceUid;
    }
    return null;
  }, [docs, selectedSourceUid, selectedTreeNodeId]);

  const selectedDoc = useMemo(
    () => docs.find((doc) => doc.source_uid === resolvedSelectedSourceUid) ?? null,
    [resolvedSelectedSourceUid, docs],
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
    setSelectedTreeNodeId(null);
    await loadDocs();
  }, [selectedSourceUidForActions, projectId, docs, loadDocs]);

  const filteredDocs = useMemo(() => {
    const query = filesQuery.trim().toLowerCase();
    if (!query) return docs;
    return docs.filter((doc) => {
      const title = doc.doc_title.toLowerCase();
      const sourceType = doc.source_type.toLowerCase();
      const locator = (doc.source_locator ?? '').toLowerCase();
      return title.includes(query) || sourceType.includes(query) || locator.includes(query);
    });
  }, [docs, filesQuery]);

  const filesTreeNodes = useMemo(
    () => buildFilesTreeNodes(filteredDocs, virtualFolders),
    [filteredDocs, virtualFolders],
  );
  const filesTreeCollection = useMemo(() => createTreeCollection<FilesTreeNode>({
    nodeToValue: (node) => node.id,
    nodeToString: (node) => node.label,
    rootNode: { id: 'root', label: '', kind: 'folder', children: filesTreeNodes } as FilesTreeNode,
  }), [filesTreeNodes]);
  const folderNodeIds = useMemo(() => collectFolderNodeIds(filesTreeNodes), [filesTreeNodes]);
  const hasFilesTreeNodes = filesTreeNodes.length > 0;

  useEffect(() => {
    setVirtualFolders(readStoredVirtualFolders(projectId));
  }, [projectId]);

  useEffect(() => {
    writeStoredVirtualFolders(projectId, virtualFolders);
  }, [projectId, virtualFolders]);

  useEffect(() => {
    expandedInitRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedValue([]);
    setSelectedTreeNodeId(null);
    setSelectedSourceUid(null);
  }, [projectId]);

  useEffect(() => {
    if (!expandedInitRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedValue(folderNodeIds);
      expandedInitRef.current = true;
      return;
    }
    setExpandedValue((current) => current.filter((id) => folderNodeIds.includes(id)));
  }, [folderNodeIds]);

  const focusPreviewInSecondColumn = useCallback(() => {
    let nextFocusedPaneId: string | null = null;
    setPanes((current) => {
      let next: Pane[] = [...current];
      if (next.length < 2) {
        next = normalizePaneWidths([
          ...next,
          {
            id: createPaneId(next),
            tabs: ['preview'],
            activeTab: 'preview',
            width: next[0]?.width ?? 50,
          },
        ]);
      }

      const secondPane = next[1];
      if (!secondPane) return next;
      nextFocusedPaneId = secondPane.id;

      // Keep current column count intact; only ensure column 2 has/activates Preview.
      const updated = next.map((pane, paneIndex) => {
        if (paneIndex !== 1) return pane;
        if (pane.tabs.includes('preview')) {
          return { ...pane, activeTab: 'preview' };
        }
        return { ...pane, tabs: [...pane.tabs, 'preview'], activeTab: 'preview' };
      });

      return normalizePaneWidths(updated);
    });
    if (nextFocusedPaneId) {
      setFocusedPaneId(nextFocusedPaneId);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      if (!selectedDoc) {
        setPreviewKind('none');
        setPreviewUrl(null);
        setPreviewText(null);
        setPreviewError(null);
        setPreviewLoading(false);
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewUrl(null);
      setPreviewText(null);

      const { url: signedUrl, error: signedUrlError } = await resolveSignedUrlForLocators([
        selectedDoc.source_locator,
        selectedDoc.conv_locator,
      ]);

      if (cancelled) return;

      if (!signedUrl) {
        setPreviewKind('none');
        setPreviewError(
          signedUrlError
            ? `Preview unavailable: ${signedUrlError}`
            : 'Preview unavailable for this document.',
        );
        setPreviewLoading(false);
        return;
      }

      if (isPdfDocument(selectedDoc)) {
        setPreviewKind('pdf');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }
      if (isImageDocument(selectedDoc)) {
        setPreviewKind('image');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }
      if (isTextDocument(selectedDoc)) {
        try {
          const response = await fetch(signedUrl);
          const text = await response.text();
          if (cancelled) return;
          const truncated = text.length > 200000 ? `${text.slice(0, 200000)}\n\n[Preview truncated]` : text;
          setPreviewKind(isMarkdownDocument(selectedDoc) ? 'markdown' : 'text');
          setPreviewText(truncated.length > 0 ? truncated : '[Empty file]');
          setPreviewUrl(signedUrl);
          setPreviewLoading(false);
          return;
        } catch {
          if (cancelled) return;
          setPreviewKind('file');
          setPreviewUrl(signedUrl);
          setPreviewLoading(false);
          return;
        }
      }
      if (isDocxDocument(selectedDoc)) {
        setPreviewKind('docx');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }
      if (isPptxDocument(selectedDoc)) {
        setPreviewKind('pptx');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }

      setPreviewKind('file');
      setPreviewUrl(signedUrl);
      setPreviewLoading(false);
    };

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedDoc]);

  const handleSelectFile = useCallback((sourceUid: string) => {
    setSelectedSourceUid(sourceUid);
    setSelectedTreeNodeId(`doc:${sourceUid}`);
    focusPreviewInSecondColumn();
  }, [focusPreviewInSecondColumn]);

  const filesTabContent = useMemo(() => {
    if (!projectId) {
      return (
        <div className="flex h-full w-full items-center justify-center p-4 text-sm text-muted-foreground">
          Select a project from the left rail to load assets.
        </div>
      );
    }

    const selectedInFiltered = !!resolvedSelectedSourceUid
      && filteredDocs.some((doc) => doc.source_uid === resolvedSelectedSourceUid);
    const selectedDocNodeId = selectedInFiltered && resolvedSelectedSourceUid ? `doc:${resolvedSelectedSourceUid}` : null;
    const selectedTreeValue = selectedTreeNodeId && filesTreeCollection.findNode(selectedTreeNodeId)
      ? [selectedTreeNodeId]
      : (selectedDocNodeId ? [selectedDocNodeId] : []);

    return (
      <div className="flex h-full w-full flex-col">
        <div className="border-b border-border p-2">
          <div className="mb-1.5 flex items-center gap-2">
            <Field.Root className="min-w-0 max-w-[50%]">
              <Field.Input
                type="text"
                value={filesQuery}
                onChange={(event) => setFilesQuery(event.currentTarget.value)}
                placeholder="Search"
                className="h-6 w-full rounded border border-border bg-background px-2 text-[11px] leading-none text-foreground outline-none placeholder:text-[11px] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Search assets"
              />
            </Field.Root>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                title="Add file"
                onClick={() => openNativeFilePicker('file')}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <IconFilePlus size={15} />
              </button>
              <button
                type="button"
                title="Add folder"
                onClick={() => {
                  if (!supportsDirectoryUpload) {
                    setDocsError('Folder picker is not supported in this browser. Use drag/drop or Add file.');
                    return;
                  }
                  openNativeFilePicker('folder');
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <IconFolderPlus size={15} />
              </button>
              <button
                type="button"
                title="Create file"
                onClick={() => { setCreatingType('file'); setCreateName(''); }}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <IconPlus size={15} />
              </button>
              <button
                type="button"
                title="Create folder"
                onClick={() => { setCreatingType('folder'); setCreateName(''); }}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <IconFolder size={15} />
              </button>
              <button
                type="button"
                title="Delete selected"
                disabled={!selectedSourceUidForActions}
                onClick={() => void handleDeleteSelected()}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
              >
                <IconTrash size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {creatingType ? (
            <div className="mb-2 flex items-center gap-1.5 rounded border border-primary/40 bg-accent/30 px-2 py-1.5">
              {creatingType === 'folder' ? (
                <IconFolder size={14} className="shrink-0 text-muted-foreground" />
              ) : (
                <IconFileText size={14} className="shrink-0 text-muted-foreground" />
              )}
              <input
                autoFocus
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && createName.trim()) {
                    void handleCreateEntry(createName, creatingType);
                  }
                  if (e.key === 'Escape') {
                    setCreatingType(null);
                    setCreateName('');
                  }
                }}
                placeholder={creatingType === 'folder' ? 'Folder name' : 'File name'}
                className="h-5 min-w-0 flex-1 border-none bg-transparent text-xs text-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => void handleCreateEntry(createName, creatingType)}
                disabled={!createName.trim()}
                className="text-[10px] font-medium text-primary hover:underline disabled:opacity-40 disabled:no-underline"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => { setCreatingType(null); setCreateName(''); }}
                className="inline-flex h-4 w-4 items-center justify-center rounded hover:bg-accent"
              >
                <IconX size={12} />
              </button>
            </div>
          ) : null}

          {docsLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Loading project assets...
            </div>
          ) : null}

          {!docsLoading && docsError ? (
            <div className="flex h-full items-center justify-center text-xs text-red-500">
              {docsError}
            </div>
          ) : null}

          {!docsLoading && !docsError && !hasFilesTreeNodes && filesQuery.trim().length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No assets in this project yet.
            </div>
          ) : null}

          {!docsLoading && !docsError && !hasFilesTreeNodes && filesQuery.trim().length > 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No assets match that filter.
            </div>
          ) : null}

          {!docsLoading && !docsError && hasFilesTreeNodes ? (
            <div
              className="h-full"
              onClick={(event) => {
                // Clicking empty space clears folder/file selection, so create actions target root.
                if (event.target !== event.currentTarget) return;
                setSelectedTreeNodeId(null);
                setSelectedSourceUid(null);
              }}
            >
              <TreeView.Root
                collection={filesTreeCollection}
                selectionMode="single"
                selectedValue={selectedTreeValue}
                expandedValue={expandedValue}
                onExpandedChange={(details) => {
                  expandedInitRef.current = true;
                  setExpandedValue(details.expandedValue);
                }}
                onSelectionChange={(details) => {
                  const nextId = details.selectedValue[0];
                  if (!nextId || nextId === 'root') return;
                  setSelectedTreeNodeId(nextId);
                  if (!nextId.startsWith('doc:')) {
                    const folderNode = findFilesTreeNodeById(filesTreeNodes, nextId);
                    const nestedSourceUid = findFirstPreviewableSourceUid(folderNode);
                    if (nestedSourceUid) {
                      handleSelectFile(nestedSourceUid);
                      return;
                    }
                    setSelectedSourceUid(null);
                    return;
                  }
                  handleSelectFile(nextId.slice('doc:'.length));
                }}
                className="text-xs"
              >
                <TreeView.Tree className="flex flex-col" aria-label="Project assets">
                  <TreeView.Context>
                    {(tree) => tree.getVisibleNodes().map((entry) => {
                      const node = entry.node as FilesTreeNode;
                      if (node.id === 'root') return null;
                      const rowPaddingLeft = `${Math.max(0, entry.indexPath.length - 1) * 12}px`;

                      return (
                        <TreeView.NodeProvider key={node.id} node={node} indexPath={entry.indexPath}>
                          <TreeView.NodeContext>
                            {(state) => {
                              const rowClassName = `flex items-center gap-2 rounded px-2 py-1.5 ${
                                state.selected
                                  ? 'bg-accent text-accent-foreground'
                                  : 'hover:bg-accent/50'
                              }`;

                              if (state.isBranch || node.kind === 'folder') {
                                return (
                                  <TreeView.Branch>
                                    <TreeView.BranchControl className={rowClassName} style={{ paddingLeft: rowPaddingLeft }}>
                                      <IconFolder size={14} className="shrink-0 text-muted-foreground" />
                                      <TreeView.BranchText className="min-w-0 flex-1 truncate text-foreground">
                                        {node.label}
                                      </TreeView.BranchText>
                                    </TreeView.BranchControl>
                                  </TreeView.Branch>
                                );
                              }

                              const fileDoc = node.doc;
                              if (!fileDoc) return null;
                              const failed = fileDoc.status.includes('failed');

                              return (
                                <TreeView.Item className={rowClassName} style={{ paddingLeft: rowPaddingLeft }}>
                                  <TreeView.ItemText className="flex min-w-0 flex-1 items-center gap-2">
                                    <IconFileText size={14} className="shrink-0 text-muted-foreground" />
                                    <span className="min-w-0 flex-1 truncate text-foreground" title={node.label}>
                                      {node.label}
                                    </span>
                                    <span className="shrink-0 text-muted-foreground">{getDocumentFormat(fileDoc)}</span>
                                    <span className="shrink-0 text-muted-foreground">{formatBytes(fileDoc.source_filesize)}</span>
                                    <span
                                      className={[
                                        'shrink-0 rounded px-1.5 py-0.5 text-[10px]',
                                        failed
                                          ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                                      ].join(' ')}
                                    >
                                      {failed ? 'failed' : 'success'}
                                    </span>
                                  </TreeView.ItemText>
                                </TreeView.Item>
                              );
                            }}
                          </TreeView.NodeContext>
                        </TreeView.NodeProvider>
                      );
                    })}
                  </TreeView.Context>
                </TreeView.Tree>
              </TreeView.Root>
            </div>
          ) : null}
        </div>
      </div>
    );
  }, [createName, creatingType, docsError, docsLoading, expandedValue, filesQuery, filesTreeCollection, filesTreeNodes, filteredDocs, handleCreateEntry, handleDeleteSelected, handleSelectFile, hasFilesTreeNodes, openNativeFilePicker, projectId, resolvedSelectedSourceUid, selectedSourceUidForActions, selectedTreeNodeId, supportsDirectoryUpload, uploadFiles]);

  const previewTabContent = useMemo(() => {
    const selectedDocTitle = selectedDoc?.doc_title ?? 'Asset';

    const renderPreviewFrame = (
      content: ReactNode,
      options?: { scroll?: boolean; padded?: boolean },
    ) => (
      <div className="h-full w-full min-h-0 p-2">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
          <div
            className={[
              'min-h-0 flex-1',
              options?.scroll === false ? 'overflow-hidden' : 'overflow-auto',
              options?.padded === false ? '' : 'p-3',
            ].join(' ')}
          >
            {content}
          </div>
        </div>
      </div>
    );

    const renderCenteredMessage = (message: ReactNode, isError = false) => (
      <div
        className={[
          'flex h-full w-full items-center justify-center text-sm',
          isError ? 'text-red-500' : 'text-muted-foreground',
        ].join(' ')}
      >
        {message}
      </div>
    );

    const renderStandardContentPreview = (
      formatLabel: string,
      content: ReactNode,
      options?: { contentClassName?: string },
    ) => renderPreviewFrame(
      <div className="parse-text-preview">
        <div className="parse-pdf-toolbar flex items-center justify-between flex-nowrap">
          <div className="parse-text-preview-file flex items-center gap-1.5 flex-nowrap">
            <IconFileText size={14} />
            <span className="parse-text-preview-filename text-xs" title={selectedDocTitle}>
              {selectedDocTitle}
            </span>
          </div>
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {formatLabel}
          </span>
        </div>
        <div className={['parse-docx-preview-viewport', options?.contentClassName ?? ''].join(' ').trim()}>
          {content}
        </div>
      </div>,
      { scroll: false, padded: false },
    );

    if (!selectedDoc) {
      return renderPreviewFrame(renderCenteredMessage('Select an asset to preview.'));
    }

    if (previewLoading) {
      return renderPreviewFrame(renderCenteredMessage('Loading preview...'));
    }

    if (previewError) {
      return renderPreviewFrame(renderCenteredMessage(previewError, true));
    }

    if (previewKind === 'pdf' && previewUrl) {
      return renderPreviewFrame(
        <PdfPreview key={`${selectedDoc.source_uid}:${previewUrl}`} url={previewUrl} />,
        { scroll: false, padded: false },
      );
    }

    if (previewKind === 'image' && previewUrl) {
      return renderStandardContentPreview(
        'IMAGE',
        <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
          <img src={previewUrl} alt={selectedDoc.doc_title} className="max-h-full max-w-full" />
        </div>,
      );
    }

    if (previewKind === 'text') {
      return renderStandardContentPreview(
        'TEXT',
        <pre className="parse-preview-text">{previewText ?? ''}</pre>,
      );
    }

    if (previewKind === 'markdown') {
      return renderStandardContentPreview(
        'MARKDOWN',
        <div className="px-3 py-2">
          <div className="parse-markdown-preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {previewText ?? ''}
            </ReactMarkdown>
          </div>
        </div>,
      );
    }

    if (previewKind === 'docx' && previewUrl) {
      return renderPreviewFrame(
        <DocxPreview key={`${selectedDoc.source_uid}:${previewUrl}`} title={selectedDoc.doc_title} url={previewUrl} />,
        { scroll: false, padded: false },
      );
    }

    if (previewKind === 'pptx' && previewUrl) {
      return renderPreviewFrame(
        <PptxPreview key={`${selectedDoc.source_uid}:${previewUrl}`} title={selectedDoc.doc_title} url={previewUrl} />,
        { scroll: false, padded: false },
      );
    }

    if (previewUrl) {
      return renderStandardContentPreview(
        'FILE',
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          <a href={previewUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Open file
          </a>
        </div>,
      );
    }

    return renderPreviewFrame(renderCenteredMessage('Preview unavailable.'));
  }, [previewError, previewKind, previewLoading, previewText, previewUrl, selectedDoc]);

  const canvasTabContent = useMemo(() => (
    <div className="h-full w-full min-h-0">
      <FlowCanvas />
    </div>
  ), []);

  const renderTabContent = (tab: TabId) => {
    // View tabs have inline-rendered content (memoized above)
    if (tab === 'assets') return filesTabContent;
    if (tab === 'preview') return previewTabContent;
    if (tab === 'canvas') return canvasTabContent;

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

      if (source.tabs.length <= 1) {
        const duplicatedTab: TabId = source.activeTab === 'assets' ? 'preview' : source.activeTab;
        const next = [...current];
        nextFocusedPaneId = createPaneId(current);
        next.splice(index + 1, 0, {
          id: nextFocusedPaneId,
          tabs: [duplicatedTab],
          activeTab: duplicatedTab,
          width: source.width,
        });
        return normalizePaneWidths(next);
      }

      // Assets is pinned to column 1 — never split it out
      const movingTab = source.activeTab === 'assets'
        ? source.tabs.find((t) => t !== 'assets')
        : source.activeTab;
      if (!movingTab) return current;
      const remainingTabs = source.tabs.filter((tab) => tab !== movingTab);
      if (remainingTabs.length === 0) return current;

      const nextActive = remainingTabs[0] ?? FALLBACK_TAB;
      const next = [...current];
      next[index] = { ...source, tabs: remainingTabs, activeTab: nextActive };
      nextFocusedPaneId = createPaneId(current);
      next.splice(index + 1, 0, {
        id: nextFocusedPaneId,
        tabs: [movingTab],
        activeTab: movingTab,
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
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] flex-col gap-3 p-3">
      <div className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
        <button
          type="button"
          onClick={() => {
            const currentIndex = panes.findIndex((p) => p.tabs.includes('assets'));
            if (currentIndex === -1) {
              setPanes((current) => activateTabInPane(current, current[0]?.id ?? 'pane-1', 'assets'));
            } else {
              setPanes((current) => closeTab(current, current[currentIndex].id, 'assets'));
            }
          }}
          style={{ fontSize: '12px', fontWeight: 500, lineHeight: '16px' }}
          className={`inline-flex h-7 items-center gap-1.5 rounded border px-2 ${
            panes.some((p) => p.tabs.includes('assets'))
              ? 'border-border bg-background text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground'
          }`}
        >
          <IconFiles size={14} />
          Assets
        </button>
        <button
          type="button"
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
          style={{ fontSize: '12px', fontWeight: 500, lineHeight: '16px' }}
          className={`inline-flex h-7 items-center gap-1.5 rounded border px-2 ${
            panes.some((p) => p.tabs.includes('preview'))
              ? 'border-border bg-background text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground'
          }`}
        >
          <IconEye size={14} />
          Preview
        </button>
        <button
          type="button"
          onClick={() => {
            const currentIndex = panes.findIndex((p) => p.tabs.includes('canvas'));
            if (currentIndex === -1) {
              setPanes((current) => activateTabInPane(current, current[current.length - 1]?.id ?? 'pane-1', 'canvas'));
            } else {
              setPanes((current) => closeTab(current, current[currentIndex].id, 'canvas'));
            }
          }}
          style={{ fontSize: '12px', fontWeight: 500, lineHeight: '16px' }}
          className={`inline-flex h-7 items-center gap-1.5 rounded border px-2 ${
            panes.some((p) => p.tabs.includes('canvas'))
              ? 'border-border bg-background text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground'
          }`}
        >
          <IconLayoutColumns size={14} />
          Canvas
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        <MenuRoot>
          <MenuTrigger asChild>
            <button
              type="button"
              style={{ fontSize: '12px', fontWeight: 500, lineHeight: '16px' }}
              className={`inline-flex h-7 items-center rounded border px-2 ${
                panes.some((p) => p.tabs.some((t) => t.startsWith('parse:')))
                  ? 'border-border bg-background text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              Parse
            </button>
          </MenuTrigger>
          <MenuPortal>
            <MenuPositioner>
              <MenuContent>
                {getTabsByGroup('parse').map((entry) => (
                  <MenuItem
                    key={entry.id}
                    value={entry.id}
                    onClick={() => {
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
        <MenuRoot
          open={pullMenuOpen}
          onOpenChange={(details) => setPullMenuOpen(details.open)}
          positioning={{ placement: 'bottom-start', offset: { mainAxis: 6 } }}
        >
          <MenuTrigger asChild>
            <button
              type="button"
              onPointerEnter={openPullMenu}
              onPointerLeave={schedulePullMenuClose}
              style={{ fontSize: '12px', fontWeight: 500, lineHeight: '16px' }}
              className={`inline-flex h-7 items-center rounded border px-2 ${
                panes.some((p) => p.tabs.some((t) => t.startsWith('pull:')))
                  ? 'border-border bg-background text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
              aria-label="Open Pull (DLT)"
              title="Open Pull (DLT)"
            >
              Pull
            </button>
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
        <button
          type="button"
          onClick={() => {
            setPanes((current) => {
              const targetPaneId = focusedPaneId ?? current[current.length - 1]?.id ?? 'pane-1';
              return activateTabInPane(current, targetPaneId, 'load');
            });
          }}
          style={{ fontSize: '12px', fontWeight: 500, lineHeight: '16px' }}
          className="inline-flex h-7 items-center gap-1.5 rounded border border-transparent px-2 text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label="Open Load (DLT)"
          title="Open Load (DLT)"
        >
          <IconDownload size={14} />
          Load
        </button>
        <button
          type="button"
          style={{ fontSize: '12px', fontWeight: 500, lineHeight: '16px' }}
          className="inline-flex h-7 items-center rounded border border-transparent px-2 text-muted-foreground hover:bg-background hover:text-foreground"
        >
          Transform
        </button>
      </div>

      <Splitter.Root
        className="flex min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-background"
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
                className="grid min-h-8 grid-cols-[auto_1fr_auto] border-b border-border bg-card"
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
                  className="inline-flex min-h-8 w-7 items-center justify-center border-r border-border text-xs text-muted-foreground"
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
                        'relative inline-flex items-center gap-1 border-r border-border px-2 text-xs',
                        pane.activeTab === tab ? 'bg-background text-foreground shadow-[inset_0_-1px_0_var(--primary)]' : 'text-muted-foreground',
                        tabDropTarget?.paneId === pane.id && tabDropTarget.insertIndex === tabIndex ? 'before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-primary' : '',
                        tabDropTarget?.paneId === pane.id && tabDropTarget.insertIndex === tabIndex + 1 && tabIndex === pane.tabs.length - 1 ? 'after:absolute after:right-0 after:top-1 after:bottom-1 after:w-0.5 after:bg-primary' : '',
                      ].join(' ')}
                    >
                      <button type="button" onClick={() => setPanes((current) => setActiveTab(current, pane.id, tab))} className="py-1">
                        {getTabLabel(tab)}
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
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-border text-xs disabled:opacity-40"
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
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
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
                'flex min-h-0 flex-1',
                hasTab(pane.activeTab)
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
  );
}
