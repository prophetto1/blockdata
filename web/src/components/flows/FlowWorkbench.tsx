import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Editor from '@monaco-editor/react';
import {
  IconCheck,
  IconCode,
  IconDotsVertical,
  IconFilePlus,
  IconFileText,
  IconFolder,
  IconFolderPlus,
  IconLayoutColumns,
  IconPlayerPlay,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { TreeView, createTreeCollection } from '@ark-ui/react/tree-view';
import {
  MenuContent,
  MenuItem,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu';
import { Clipboard } from '@ark-ui/react/clipboard';
import { Portal } from '@ark-ui/react/portal';
import { Splitter } from '@ark-ui/react/splitter';
import { Switch } from '@ark-ui/react/switch';
import { Tooltip } from '@ark-ui/react/tooltip';
import { edgeJson } from '@/lib/edge';
import FlowCanvas from './FlowCanvas';
import {
  activateTabInPane,
  closeTabInPane,
  createInitialPanes,
  FLOW_WORKBENCH_TABS,
  setActiveTabInPane,
  type Pane,
  type PaneTabId,
} from './flowWorkbenchState';
import './FlowWorkbench.css';

// ─── Monaco theme sync ──────────────────────────────────────────────────────

function subscribeTheme(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function getMonacoTheme(): string {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'vs-dark';
}

function useMonacoTheme(): string {
  return useSyncExternalStore(subscribeTheme, getMonacoTheme, () => 'vs-dark');
}

// ─── Types ───────────────────────────────────────────────────────────────────

type FlowWorkbenchProps = {
  flowId: string;
  flowName: string;
  namespace: string;
};

type DragTabState = {
  tabId: PaneTabId;
  fromPaneId: string;
};

type DragPaneState = {
  fromIndex: number;
};

type PointerPaneState = {
  fromIndex: number;
};

type DragPayload =
  | {
    kind: 'pane';
    fromIndex: number;
  }
  | {
    kind: 'tab';
    tabId: PaneTabId;
    fromPaneId: string;
  };

type PanelButtonDescriptor = {
  tabId: PaneTabId;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
};

const MIN_PANE_PERCENT = 18;
const SAVE_KEY_PREFIX = 'flow-workbench-layout';
const FILES_SAVE_KEY_PREFIX = 'flow-workbench-files';
const DRAG_PAYLOAD_MIME = 'application/x-flow-workbench-drag';

const TAB_IDS = FLOW_WORKBENCH_TABS.map((tab) => tab.id) as readonly PaneTabId[];

const PANEL_BUTTONS: PanelButtonDescriptor[] = [
  { tabId: 'flowCode', label: 'Flow Code', Icon: IconCode },
  { tabId: 'nocode', label: 'No-code', Icon: IconLayoutColumns },
  { tabId: 'topology', label: 'Topology', Icon: IconLayoutColumns },
  { tabId: 'documentation', label: 'Documentation', Icon: IconFileText },
  { tabId: 'files', label: 'Files', Icon: IconFolder },
  { tabId: 'blueprints', label: 'Blueprints', Icon: IconPlayerPlay },
];

type PersistedPane = {
  id: string;
  tabs: string[];
  activeTab: string;
  width: number;
};

type FileTreeEntry = {
  path: string;
  isFile: boolean;
  size?: number;
  date?: Date;
};

type FlowMetadataResponse = {
  id?: string;
  namespace?: string;
  revision?: number;
  source?: string;
};

type FlowValidationViolation = {
  path?: string;
  message?: string;
};

function isPaneTabId(value: string): value is PaneTabId {
  return TAB_IDS.some((tabId) => tabId === value);
}

function normalizePaneWidths(input: Pane[]): Pane[] {
  if (input.length === 0) return input;
  const total = input.reduce((sum, pane) => sum + pane.width, 0);
  if (total <= 0) {
    const equal = 100 / input.length;
    return input.map((pane) => ({ ...pane, width: equal }));
  }

  return input.map((pane) => ({
    ...pane,
    width: (pane.width / total) * 100,
  }));
}

function tabLabel(tabId: PaneTabId): string {
  return FLOW_WORKBENCH_TABS.find((item) => item.id === tabId)?.label ?? tabId;
}

function fallbackTab(): PaneTabId {
  return 'flowCode';
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
    const tabId = segments[2];
    if (!fromPaneId || !tabId || !isPaneTabId(tabId)) return null;
    return { kind: 'tab', fromPaneId, tabId };
  }

  return null;
}

function readDragPayload(dataTransfer: DataTransfer | null | undefined): DragPayload | null {
  if (!dataTransfer) return null;
  const custom = dataTransfer.getData(DRAG_PAYLOAD_MIME);
  const parsedCustom = parseDragPayload(custom);
  if (parsedCustom) return parsedCustom;

  const plain = dataTransfer.getData('text/plain');
  return parseDragPayload(plain);
}

function downloadTextFile(filename: string, contents: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([contents], { type: 'text/yaml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

function buildDefaultFlowCode(flowName: string, namespace: string): string {
  return `id: ${flowName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
namespace: ${namespace}

tasks:
  - id: hello
    type: io.kestra.plugin.core.log.Log
    message: "Hello from ${flowName}"`;
}

function readPersistedPanes(saveKey: string): Pane[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(saveKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedPane[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const normalized = parsed.map((item, index): Pane => {
      const tabs = Array.from(
        new Set((item.tabs ?? []).filter((candidate): candidate is PaneTabId => isPaneTabId(candidate))),
      );
      const resolvedTabs = tabs.length > 0 ? tabs : [fallbackTab()];
      const resolvedActive = isPaneTabId(item.activeTab) && resolvedTabs.includes(item.activeTab)
        ? item.activeTab
        : resolvedTabs[0];

      return {
        id: item.id || `pane-${index + 1}`,
        tabs: resolvedTabs,
        activeTab: resolvedActive,
        width: Number.isFinite(item.width) && item.width > 0 ? item.width : 100 / parsed.length,
      };
    });

    return normalizePaneWidths(normalized);
  } catch {
    return null;
  }
}

function getUploadedPath(file: File): string {
  const withRelative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const next = (withRelative && withRelative.trim().length > 0) ? withRelative : file.name;
  return next.replace(/^\/+/, '');
}

function normalizeFilePath(input: string): string {
  return input.trim().replace(/^\/+/, '').replace(/\/+$/, '');
}

function readPersistedFileEntries(storageKey: string): FileTreeEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<{
      path?: unknown;
      isFile?: unknown;
      size?: unknown;
      date?: unknown;
    }>;
    if (!Array.isArray(parsed)) return [];

    const deduped = new Map<string, FileTreeEntry>();
    parsed.forEach((item) => {
      const normalizedPath = normalizeFilePath(typeof item.path === 'string' ? item.path : '');
      if (!normalizedPath) return;
      const size = typeof item.size === 'number' && Number.isFinite(item.size) ? item.size : undefined;
      const dateValue = item.date instanceof Date
        ? item.date
        : (typeof item.date === 'string' || typeof item.date === 'number')
          ? new Date(item.date)
          : undefined;

      deduped.set(normalizedPath, {
        path: normalizedPath,
        isFile: item.isFile !== false,
        size,
        date: dateValue && !Number.isNaN(dateValue.valueOf()) ? dateValue : undefined,
      });
    });

    return Array.from(deduped.values());
  } catch {
    return [];
  }
}

function writePersistedFileEntries(storageKey: string, entries: FileTreeEntry[]) {
  if (typeof window === 'undefined') return;
  const normalized = entries
    .map((entry) => {
      const path = normalizeFilePath(entry.path);
      if (!path) return null;
      return {
        path,
        isFile: entry.isFile,
        size: typeof entry.size === 'number' && Number.isFinite(entry.size) ? entry.size : undefined,
        date: entry.date ? entry.date.toISOString() : undefined,
      };
    })
    .filter((entry) => entry !== null);
  window.localStorage.setItem(storageKey, JSON.stringify(normalized));
}

type FilesTreeNode = {
  id: string;
  label: string;
  kind: 'folder' | 'file';
  path: string;
  children?: FilesTreeNode[];
  size?: number;
  date?: Date;
};

type MutableFolderNode = {
  id: string;
  label: string;
  path: string;
  folders: Map<string, MutableFolderNode>;
  files: FilesTreeNode[];
};

function parseTreeNodeId(id: string | null): { kind: 'folder' | 'file'; path: string } | null {
  if (!id) return null;
  if (id.startsWith('folder:')) return { kind: 'folder', path: normalizeFilePath(id.slice('folder:'.length)) };
  if (id.startsWith('file:')) return { kind: 'file', path: normalizeFilePath(id.slice('file:'.length)) };
  return null;
}

function getParentPath(path: string): string {
  const normalized = normalizeFilePath(path);
  if (!normalized.includes('/')) return '';
  return normalized.split('/').slice(0, -1).join('/');
}

function formatBytes(value?: number): string {
  if (!value || !Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const precision = index === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[index]}`;
}

function buildFilesTreeNodes(entries: FileTreeEntry[]): FilesTreeNode[] {
  const root: MutableFolderNode = {
    id: 'folder:',
    label: '',
    path: '',
    folders: new Map(),
    files: [],
  };

  const ensureFolder = (folderPath: string): MutableFolderNode => {
    const normalized = normalizeFilePath(folderPath);
    if (!normalized) return root;
    const segments = normalized.split('/').filter(Boolean);
    let cursor = root;
    let cursorPath = '';
    segments.forEach((segment) => {
      cursorPath = cursorPath ? `${cursorPath}/${segment}` : segment;
      const existing = cursor.folders.get(segment);
      if (existing) {
        cursor = existing;
        return;
      }
      const created: MutableFolderNode = {
        id: `folder:${cursorPath}`,
        label: segment,
        path: cursorPath,
        folders: new Map(),
        files: [],
      };
      cursor.folders.set(segment, created);
      cursor = created;
    });
    return cursor;
  };

  entries.forEach((entry) => {
    const normalizedPath = normalizeFilePath(entry.path);
    if (!normalizedPath) return;
    if (!entry.isFile) {
      ensureFolder(normalizedPath);
      return;
    }

    const fileName = normalizedPath.split('/').pop();
    if (!fileName) return;
    const parent = ensureFolder(getParentPath(normalizedPath));
    if (parent.files.some((file) => file.path === normalizedPath)) return;
    parent.files.push({
      id: `file:${normalizedPath}`,
      label: fileName,
      kind: 'file',
      path: normalizedPath,
      size: entry.size,
      date: entry.date,
    });
  });

  const toNodes = (folder: MutableFolderNode): FilesTreeNode[] => {
    const folderNodes = Array.from(folder.folders.values())
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((child) => ({
        id: child.id,
        label: child.label,
        kind: 'folder' as const,
        path: child.path,
        children: toNodes(child),
      }));
    const fileNodes = [...folder.files]
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((file) => ({ ...file }));
    return [...folderNodes, ...fileNodes];
  };

  return toNodes(root);
}

function filterFilesTreeNodes(nodes: FilesTreeNode[], query: string): FilesTreeNode[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return nodes;

  const walk = (input: FilesTreeNode[]): FilesTreeNode[] => input.flatMap((node) => {
    const filteredChildren = node.children ? walk(node.children) : undefined;
    const matches = node.label.toLowerCase().includes(normalizedQuery)
      || node.path.toLowerCase().includes(normalizedQuery);
    if (!matches && (!filteredChildren || filteredChildren.length === 0)) return [];
    return [{ ...node, children: filteredChildren }];
  });

  return walk(nodes);
}

function collectFolderNodeIds(nodes: FilesTreeNode[]): string[] {
  const result: string[] = [];
  const walk = (input: FilesTreeNode[]) => {
    input.forEach((node) => {
      if (node.kind !== 'folder') return;
      result.push(node.id);
      if (node.children && node.children.length > 0) walk(node.children);
    });
  };
  walk(nodes);
  return result;
}

function FilesTree({ storageKey }: { storageKey: string }) {
  const [localEntries, setLocalEntries] = useState<FileTreeEntry[]>(() => readPersistedFileEntries(storageKey));
  const [filesQuery, setFilesQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedValue, setExpandedValue] = useState<string[]>([]);
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [createName, setCreateName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasAutoExpandedRef = useRef(false);

  useEffect(() => {
    const persisted = readPersistedFileEntries(storageKey);
    setLocalEntries(persisted);
    setSelectedNodeId(null);
    setExpandedValue([]);
    hasAutoExpandedRef.current = false;
  }, [storageKey]);

  const mergeUploadedFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setLocalEntries((current) => {
      const map = new Map<string, FileTreeEntry>(current.map((entry) => [entry.path, entry]));
      files.forEach((file) => {
        const normalized = normalizeFilePath(getUploadedPath(file));
        if (!normalized) return;
        map.set(normalized, {
          path: normalized,
          isFile: true,
          size: file.size,
          date: new Date(file.lastModified || Date.now()),
        });
      });
      return Array.from(map.values());
    });
  }, []);

  useEffect(() => {
    writePersistedFileEntries(storageKey, localEntries);
  }, [localEntries, storageKey]);

  const treeNodes = useMemo(() => filterFilesTreeNodes(buildFilesTreeNodes(localEntries), filesQuery), [filesQuery, localEntries]);
  const treeCollection = useMemo(() => createTreeCollection<FilesTreeNode>({
    nodeToValue: (node) => node.id,
    nodeToString: (node) => node.label,
    rootNode: { id: 'root', label: '', kind: 'folder', path: '', children: treeNodes } as FilesTreeNode,
  }), [treeNodes]);
  const folderNodeIds = useMemo(() => collectFolderNodeIds(treeNodes), [treeNodes]);

  useEffect(() => {
    setExpandedValue((current) => {
      if (folderNodeIds.length === 0) return [];
      if (!hasAutoExpandedRef.current) {
        hasAutoExpandedRef.current = true;
        return folderNodeIds;
      }
      const allowed = new Set(folderNodeIds);
      return current.filter((id) => allowed.has(id));
    });
  }, [folderNodeIds]);

  const selectedNode = useMemo(() => parseTreeNodeId(selectedNodeId), [selectedNodeId]);

  const createTargetFolderPath = useMemo(() => {
    if (!creatingType) return '';
    if (selectedNode?.kind === 'folder') return selectedNode.path;
    if (selectedNode?.kind === 'file') return getParentPath(selectedNode.path);
    return '';
  }, [creatingType, selectedNode]);

  const createTargetFolderId = createTargetFolderPath ? `folder:${createTargetFolderPath}` : null;

  const handleCreateEntry = useCallback((name: string, kind: 'file' | 'folder') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const targetFolder = createTargetFolderPath;
    const nextPath = normalizeFilePath(targetFolder ? `${targetFolder}/${trimmed}` : trimmed);
    if (!nextPath) return;
    setLocalEntries((current) => {
      const map = new Map<string, FileTreeEntry>(current.map((entry) => [entry.path, entry]));
      if (map.has(nextPath)) return current;
      map.set(nextPath, {
        path: nextPath,
        isFile: kind === 'file',
        size: kind === 'file' ? 0 : undefined,
        date: new Date(),
      });
      return Array.from(map.values());
    });
    setCreatingType(null);
    setCreateName('');
    setSelectedNodeId(`${kind}:${nextPath}`);
  }, [createTargetFolderPath]);

  const handleDeleteSelected = useCallback(() => {
    const selectedPath = selectedNode?.path;
    if (!selectedPath) return;
    setLocalEntries((current) => current.filter((entry) => (
      entry.path !== selectedPath && !entry.path.startsWith(`${selectedPath}/`)
    )));
    setSelectedNodeId(null);
  }, [selectedNode]);

  const handleRenameComplete = useCallback((details: { value: string; indexPath: number[] }) => {
    const node = treeCollection.at(details.indexPath) as FilesTreeNode | undefined;
    if (!node) return;
    const parsed = parseTreeNodeId(node.id);
    if (!parsed) return;
    const newLabel = details.value.trim();
    if (!newLabel || newLabel === node.label) return;
    const oldPath = parsed.path;
    const parentPath = getParentPath(oldPath);
    const newPath = normalizeFilePath(parentPath ? `${parentPath}/${newLabel}` : newLabel);
    if (!newPath || newPath === oldPath) return;
    setLocalEntries((current) => current.map((entry) => {
      if (entry.path === oldPath || entry.path.startsWith(`${oldPath}/`)) {
        const suffix = entry.path.slice(oldPath.length);
        return { ...entry, path: `${newPath}${suffix}` };
      }
      return entry;
    }));
    setSelectedNodeId(`${parsed.kind}:${newPath}`);
  }, [treeCollection]);

  return (
    <div className="flow-workbench-filemanager-wrap flow-workbench-files-ark">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = event.currentTarget.files ? Array.from(event.currentTarget.files) : [];
          mergeUploadedFiles(files);
          event.currentTarget.value = '';
        }}
      />
      <div className="flow-workbench-files-header">
        <div className="flow-workbench-files-toolbar">
          <input
            type="text"
            value={filesQuery}
            onChange={(event) => setFilesQuery(event.currentTarget.value)}
            placeholder="Search files"
            aria-label="Search files"
            className="flow-workbench-files-search"
          />
          <div className="flow-workbench-files-actions">
            <button
              type="button"
              title="Upload files"
              onClick={() => fileInputRef.current?.click()}
              className="flow-workbench-files-action-btn"
            >
              <IconUpload size={15} />
            </button>
            <button
              type="button"
              title="Create file"
              onClick={() => {
                setCreatingType('file');
                setCreateName('');
                if (selectedNode?.kind === 'folder') {
                  const folderId = `folder:${selectedNode.path}`;
                  setExpandedValue((prev) => prev.includes(folderId) ? prev : [...prev, folderId]);
                }
              }}
              className="flow-workbench-files-action-btn"
            >
              <IconFilePlus size={15} />
            </button>
            <button
              type="button"
              title="Create folder"
              onClick={() => {
                setCreatingType('folder');
                setCreateName('');
                if (selectedNode?.kind === 'folder') {
                  const folderId = `folder:${selectedNode.path}`;
                  setExpandedValue((prev) => prev.includes(folderId) ? prev : [...prev, folderId]);
                }
              }}
              className="flow-workbench-files-action-btn"
            >
              <IconFolderPlus size={15} />
            </button>
            <button
              type="button"
              title="Delete selected"
              disabled={!selectedNode?.path}
              onClick={handleDeleteSelected}
              className="flow-workbench-files-action-btn flow-workbench-files-action-btn-danger"
            >
              <IconTrash size={15} />
            </button>
          </div>
        </div>
      </div>
      <div className="flow-workbench-files-tree-area">
        {treeNodes.length === 0 ? (
          <div className="flow-workbench-files-empty">
            {filesQuery.trim().length > 0 ? 'No files match that filter.' : 'No files yet.'}
          </div>
        ) : (
          <TreeView.Root
            collection={treeCollection}
            selectionMode="single"
            selectedValue={selectedNodeId ? [selectedNodeId] : []}
            expandedValue={expandedValue}
            expandOnClick
            onExpandedChange={(details) => setExpandedValue(details.expandedValue)}
            onSelectionChange={(details) => {
              const nextSelected = details.selectedValue[0];
              setSelectedNodeId(nextSelected ?? null);
            }}
            canRename={() => true}
            onRenameComplete={handleRenameComplete}
            className="text-xs"
          >
            <TreeView.Tree className="flex flex-col" aria-label="Flow files">
              {creatingType && !createTargetFolderId ? (
                <div className="flow-workbench-files-create" style={{ paddingLeft: '0px' }}>
                  {creatingType === 'folder' ? (
                    <IconFolder size={14} className="shrink-0 text-muted-foreground" />
                  ) : (
                    <IconFileText size={14} className="shrink-0 text-muted-foreground" />
                  )}
                  <input
                    autoFocus
                    type="text"
                    value={createName}
                    onChange={(event) => setCreateName(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleCreateEntry(createName, creatingType);
                      if (event.key === 'Escape') { setCreatingType(null); setCreateName(''); }
                    }}
                    placeholder={creatingType === 'folder' ? 'Folder name' : 'File name'}
                    className="flow-workbench-files-create-input"
                  />
                  <button type="button" disabled={!createName.trim()} onClick={() => handleCreateEntry(createName, creatingType)} className="flow-workbench-files-create-submit">Create</button>
                  <button type="button" onClick={() => { setCreatingType(null); setCreateName(''); }} className="flow-workbench-files-create-cancel"><IconX size={12} /></button>
                </div>
              ) : null}
              <TreeView.Context>
                {(tree) => tree.getVisibleNodes().map((entry) => {
                  const node = entry.node as FilesTreeNode;
                  if (node.id === 'root') return null;
                  const depth = Math.max(0, entry.indexPath.length - 1);
                  const rowPaddingLeft = `${depth * 12}px`;
                  const isCreateTarget = creatingType && node.id === createTargetFolderId;
                  const createRow = isCreateTarget ? (
                    <div key="__create__" className="flow-workbench-files-create" style={{ paddingLeft: `${(depth + 1) * 12}px` }}>
                      {creatingType === 'folder' ? (
                        <IconFolder size={14} className="shrink-0 text-muted-foreground" />
                      ) : (
                        <IconFileText size={14} className="shrink-0 text-muted-foreground" />
                      )}
                      <input
                        autoFocus
                        type="text"
                        value={createName}
                        onChange={(event) => setCreateName(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleCreateEntry(createName, creatingType);
                          if (event.key === 'Escape') { setCreatingType(null); setCreateName(''); }
                        }}
                        placeholder={creatingType === 'folder' ? 'Folder name' : 'File name'}
                        className="flow-workbench-files-create-input"
                      />
                      <button type="button" disabled={!createName.trim()} onClick={() => handleCreateEntry(createName, creatingType!)} className="flow-workbench-files-create-submit">Create</button>
                      <button type="button" onClick={() => { setCreatingType(null); setCreateName(''); }} className="flow-workbench-files-create-cancel"><IconX size={12} /></button>
                    </div>
                  ) : null;
                  return (
                    <TreeView.NodeProvider key={node.id} node={node} indexPath={entry.indexPath}>
                      <TreeView.NodeContext>
                        {(state) => {
                          const rowClassName = `flow-workbench-files-row ${
                            state.selected
                              ? 'flow-workbench-files-row-selected'
                              : 'flow-workbench-files-row-hover'
                          }`;
                          if (state.isBranch || node.kind === 'folder') {
                            return (
                              <>
                                <TreeView.Branch>
                                  <TreeView.BranchControl className={rowClassName} style={{ paddingLeft: rowPaddingLeft }}>
                                    <IconFolder size={14} className="shrink-0 text-muted-foreground" />
                                    {state.renaming ? (
                                      <TreeView.NodeRenameInput className="flow-workbench-files-rename-input" />
                                    ) : (
                                      <TreeView.BranchText className="min-w-0 flex-1 truncate text-foreground">
                                        {node.label}
                                      </TreeView.BranchText>
                                    )}
                                  </TreeView.BranchControl>
                                </TreeView.Branch>
                                {createRow}
                              </>
                            );
                          }
                          return (
                            <TreeView.Item className={rowClassName} style={{ paddingLeft: rowPaddingLeft }}>
                              <TreeView.ItemText className="flex min-w-0 flex-1 items-center gap-2">
                                <IconFileText size={14} className="shrink-0 text-muted-foreground" />
                                {state.renaming ? (
                                  <TreeView.NodeRenameInput className="flow-workbench-files-rename-input" />
                                ) : (
                                  <>
                                    <span className="min-w-0 flex-1 truncate text-foreground">{node.label}</span>
                                    <span className="shrink-0 text-muted-foreground">{formatBytes(node.size)}</span>
                                  </>
                                )}
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
        )}
      </div>
    </div>
  );
}

function renderTabContent(
  tabId: PaneTabId,
  flowName: string,
  codeDraft: string,
  setCodeDraft: (next: string) => void,
  monacoTheme: string,
  filesStorageKey: string,
) {
  switch (tabId) {
    case 'flowCode':
      return (
        <div className="flow-workbench-code-panel">
          <Editor
            language="yaml"
            theme={monacoTheme}
            value={codeDraft}
            onChange={(value) => setCodeDraft(value ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: 'gutter',
              folding: true,
              lineNumbersMinChars: 3,
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            }}
          />
        </div>
      );
    case 'topology':
      return <FlowCanvas />;
    case 'documentation':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-foreground">Documentation</p>
          <p className="text-sm text-muted-foreground">
            Shared contract notes for {flowName}.
          </p>
        </div>
      );
    case 'files':
      return (
        <FilesTree storageKey={filesStorageKey} />
      );
    case 'blueprints':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-foreground">Blueprints</p>
          <p className="text-sm text-muted-foreground">Blueprint catalog integration is staged for this surface.</p>
        </div>
      );
    case 'nocode':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-foreground">No-code</p>
          <p className="text-sm text-muted-foreground">No-code form shell placeholder.</p>
        </div>
      );
    default:
      return null;
  }
}

export default function FlowWorkbench({ flowId, flowName, namespace }: FlowWorkbenchProps) {
  const dragStateRef = useRef<DragTabState | null>(null);
  const dragPaneStateRef = useRef<DragPaneState | null>(null);
  const pointerPaneStateRef = useRef<PointerPaneState | null>(null);
  const saveKey = `${SAVE_KEY_PREFIX}:${namespace}:${flowId}`;
  const filesSaveKey = `${FILES_SAVE_KEY_PREFIX}:${namespace}:${flowId}`;
  const flowPath = useMemo(
    () => `flows/${encodeURIComponent(namespace)}/${encodeURIComponent(flowId)}`,
    [flowId, namespace],
  );

  const monacoTheme = useMonacoTheme();
  const [panes, setPanes] = useState<Pane[]>(createInitialPanes);
  const [codeDraft, setCodeDraft] = useState(() => buildDefaultFlowCode(flowName, namespace));
  const [savedCode, setSavedCode] = useState(() => buildDefaultFlowCode(flowName, namespace));
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const [focusedPaneId, setFocusedPaneId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<FlowValidationViolation[]>([]);
  const [dragOverPaneIndex, setDragOverPaneIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const isDirty = useMemo(() => codeDraft !== savedCode, [codeDraft, savedCode]);

  useEffect(() => {
    const persisted = readPersistedPanes(saveKey);
    if (persisted && persisted.length > 0) {
      setPanes(persisted);
      setFocusedPaneId(persisted[0]?.id ?? null);
      return;
    }
    const initial = createInitialPanes();
    setPanes(initial);
    setFocusedPaneId(initial[0]?.id ?? null);
  }, [saveKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = panes.map((pane): PersistedPane => ({
      id: pane.id,
      tabs: pane.tabs,
      activeTab: pane.activeTab,
      width: pane.width,
    }));
    window.localStorage.setItem(saveKey, JSON.stringify(payload));
  }, [panes, saveKey]);

  useEffect(() => {
    setCodeDraft((previous) => {
      const trimmed = previous.trim();
      if (trimmed.length > 0) return previous;
      return buildDefaultFlowCode(flowName, namespace);
    });
  }, [flowName, namespace]);

  useEffect(() => {
    let cancelled = false;

    const loadFlowSource = async () => {
      try {
        const metadata = await edgeJson<FlowMetadataResponse>(`${flowPath}?source=true`);
        if (cancelled) return;

        const nextSource = typeof metadata.source === 'string' && metadata.source.trim().length > 0
          ? metadata.source
          : buildDefaultFlowCode(flowName, namespace);
        setCodeDraft(nextSource);
        setSavedCode(nextSource);
        setValidationIssues([]);
      } catch {
        if (cancelled) return;
        setValidationIssues([]);
      }
    };

    void loadFlowSource();
    return () => {
      cancelled = true;
    };
  }, [flowName, flowPath, namespace]);

  useEffect(() => {
    if (panes.length === 0) {
      setFocusedPaneId(null);
      return;
    }
    if (!focusedPaneId || !panes.some((pane) => pane.id === focusedPaneId)) {
      setFocusedPaneId(panes[0].id);
    }
  }, [focusedPaneId, panes]);

  const removeColumn = useCallback((paneId: string) => {
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

  const splitPanel = useCallback((panelIndex: number) => {
    let createdPaneId: string | null = null;
    setPanes((current) => {
      const panel = current[panelIndex];
      if (!panel) return current;

      if (panel.tabs.length <= 1) {
        createdPaneId = createPaneId(current);
        const duplicatedTab = panel.activeTab;
        const next = [...current];
        next.splice(panelIndex + 1, 0, {
          id: createdPaneId,
          tabs: [duplicatedTab],
          activeTab: duplicatedTab,
          width: panel.width,
        });
        return normalizePaneWidths(next);
      }

      const activeTabIndex = panel.tabs.findIndex((tab) => tab === panel.activeTab);
      if (activeTabIndex < 0) return current;

      const movedTab = panel.tabs[activeTabIndex];
      const remainingTabs = panel.tabs.filter((_, index) => index !== activeTabIndex);
      if (remainingTabs.length === 0) return current;

      const nextActive = remainingTabs[activeTabIndex - 1] ?? remainingTabs[activeTabIndex] ?? remainingTabs[0];
      createdPaneId = createPaneId(current);
      const next = [...current];
      next[panelIndex] = {
        ...panel,
        tabs: remainingTabs,
        activeTab: nextActive,
      };
      next.splice(panelIndex + 1, 0, {
        id: createdPaneId,
        tabs: [movedTab],
        activeTab: movedTab,
        width: panel.width,
      });
      return normalizePaneWidths(next);
    });

    if (createdPaneId) {
      setFocusedPaneId(createdPaneId);
    }
  }, []);

  const closeAllPanelsInPane = useCallback((paneId: string) => {
    setPanes((current) => current.map((pane) => {
      if (pane.id !== paneId) return pane;
      const defaultTab = fallbackTab();
      return {
        ...pane,
        tabs: [defaultTab],
        activeTab: defaultTab,
      };
    }));
  }, []);

  const setActiveTab = useCallback((paneId: string, tabId: PaneTabId) => {
    setFocusedPaneId(paneId);
    setPanes((current) => setActiveTabInPane(current, paneId, tabId));
  }, []);

  const closeTab = useCallback((paneId: string, tabId: PaneTabId) => {
    setPanes((current) => closeTabInPane(current, paneId, tabId));
  }, []);

  const closeTabOrColumn = useCallback((pane: Pane, tabId: PaneTabId) => {
    if (pane.tabs.length > 1) {
      closeTab(pane.id, tabId);
      return;
    }
    removeColumn(pane.id);
  }, [closeTab, removeColumn]);

  const openPanelFromToolbar = useCallback((tabId: PaneTabId) => {
    const existingPane = panes.find((pane) => pane.tabs.includes(tabId));
    if (existingPane) {
      setFocusedPaneId(existingPane.id);
      setPanes((current) => setActiveTabInPane(current, existingPane.id, tabId));
      return;
    }

    const targetPaneId = focusedPaneId && panes.some((pane) => pane.id === focusedPaneId)
      ? focusedPaneId
      : panes[0]?.id;
    if (!targetPaneId) return;

    setFocusedPaneId(targetPaneId);
    setPanes((current) => activateTabInPane(current, targetPaneId, tabId));
  }, [focusedPaneId, panes]);

  const handleExportFlow = useCallback(() => {
    const fallbackName = flowId.slice(0, 8);
    const filenameStem = flowName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const filename = `${filenameStem || fallbackName}.yaml`;
    downloadTextFile(filename, codeDraft);
    setActionNotice(`Exported ${filename}.`);
  }, [codeDraft, flowId, flowName]);

  const handleDeleteFlow = useCallback(() => {
    setCodeDraft('');
    setValidationIssues([]);
    setActionNotice('Flow code cleared.');
  }, []);

  const onCopyStatusChange = useCallback((details: { copied: boolean }) => {
    if (details.copied) {
      setActionNotice('Flow code copied.');
    }
  }, []);

  const handleValidateFlow = useCallback(async () => {
    setIsValidating(true);
    try {
      setValidationIssues([]);
      const violations = await edgeJson<FlowValidationViolation[]>('flows/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-yaml',
        },
        body: codeDraft,
      });

      if (!Array.isArray(violations) || violations.length === 0) {
        setActionNotice('Validation passed.');
        return;
      }

      setValidationIssues(violations);
      const first = violations[0];
      const path = typeof first.path === 'string' && first.path.length > 0 ? `${first.path}: ` : '';
      const message = typeof first.message === 'string' && first.message.length > 0
        ? first.message
        : 'Flow source is invalid.';
      setActionNotice(`Validation failed (${path}${message})`);
    } catch {
      setValidationIssues([]);
    } finally {
      setIsValidating(false);
    }
  }, [codeDraft]);

  const handleSaveFlow = useCallback(async () => {
    setIsSaving(true);
    try {
      const saved = await edgeJson<FlowMetadataResponse>(flowPath, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-yaml',
        },
        body: codeDraft,
      });

      const persistedSource = typeof saved.source === 'string' && saved.source.length > 0
        ? saved.source
        : codeDraft;
      if (typeof saved.source === 'string' && saved.source.length > 0) {
        setCodeDraft(saved.source);
      }
      setSavedCode(persistedSource);
      setValidationIssues([]);
      const revisionLabel = typeof saved.revision === 'number' ? ` revision ${saved.revision}` : '';
      setActionNotice(`Saved${revisionLabel}.`);
    } catch {
      setValidationIssues([]);
    } finally {
      setIsSaving(false);
    }
  }, [codeDraft, flowPath]);

  const moveTabAcrossPanes = useCallback((toPaneId: string, dragInput?: DragTabState | null) => {
    const drag = dragInput ?? dragStateRef.current;
    if (!drag) return;
    if (drag.fromPaneId === toPaneId) return;

    setFocusedPaneId(toPaneId);
    setPanes((current) => activateTabInPane(current, toPaneId, drag.tabId));
  }, []);

  const endPaneDrag = useCallback(() => {
    pointerPaneStateRef.current = null;
    dragPaneStateRef.current = null;
    setDragOverPaneIndex(null);
  }, []);

  const endPointerPaneDrag = useCallback(() => {
    pointerPaneStateRef.current = null;
    dragPaneStateRef.current = null;
    setDragOverPaneIndex(null);
  }, []);

  const startPointerPaneDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>, fromIndex: number) => {
    if (event.button !== 0) return;
    pointerPaneStateRef.current = { fromIndex };
    dragPaneStateRef.current = { fromIndex };
    dragStateRef.current = null;
    setDragOverPaneIndex(fromIndex);
    event.preventDefault();
  }, []);

  const movePane = useCallback((toIndex: number) => {
    const drag = dragPaneStateRef.current;
    if (!drag) return;
    if (drag.fromIndex === toIndex) return;

    setPanes((current) => {
      if (drag.fromIndex < 0 || drag.fromIndex >= current.length) return current;
      if (toIndex < 0 || toIndex >= current.length) return current;

      const next = [...current];
      const [moved] = next.splice(drag.fromIndex, 1);
      if (!moved) return current;
      const insertIndex = drag.fromIndex < toIndex
        ? Math.min(toIndex, next.length)
        : toIndex;
      next.splice(insertIndex, 0, moved);
      dragPaneStateRef.current = { fromIndex: insertIndex };
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePointerMove = (event: PointerEvent) => {
      const pointerDrag = pointerPaneStateRef.current;
      if (!pointerDrag) return;

      const paneCandidate = document
        .elementsFromPoint(event.clientX, event.clientY)
        .find((element) => element instanceof HTMLElement && element.dataset.flowPaneIndex !== undefined);
      if (!(paneCandidate instanceof HTMLElement)) return;

      const paneIndex = Number.parseInt(paneCandidate.dataset.flowPaneIndex ?? '', 10);
      if (!Number.isFinite(paneIndex) || paneIndex < 0) return;

      if (pointerDrag.fromIndex === paneIndex) {
        setDragOverPaneIndex((current) => (current === paneIndex ? current : paneIndex));
        return;
      }

      dragPaneStateRef.current = { fromIndex: pointerDrag.fromIndex };
      movePane(paneIndex);
      pointerPaneStateRef.current = { fromIndex: paneIndex };
      setDragOverPaneIndex(paneIndex);
    };

    const handlePointerEnd = () => {
      if (!pointerPaneStateRef.current) return;
      endPointerPaneDrag();
    };

    const handleWindowBlur = () => {
      if (!pointerPaneStateRef.current) return;
      endPointerPaneDrag();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [endPointerPaneDrag, movePane]);

  const handlePaneDragOver = useCallback((event: React.DragEvent, paneIndex: number) => {
    const payload = readDragPayload(event.dataTransfer);
    if (!payload && !dragPaneStateRef.current && !dragStateRef.current) return;
    event.preventDefault();
    event.stopPropagation();

    if (payload?.kind === 'pane') {
      dragPaneStateRef.current = { fromIndex: payload.fromIndex };
    }

    if (dragOverPaneIndex !== paneIndex) {
      setDragOverPaneIndex(paneIndex);
    }
  }, [dragOverPaneIndex]);

  const handlePaneDrop = useCallback((event: React.DragEvent, paneIndex: number, paneId: string) => {
    event.preventDefault();
    event.stopPropagation();

    const payload = readDragPayload(event.dataTransfer);
    if (payload?.kind === 'pane') {
      dragPaneStateRef.current = { fromIndex: payload.fromIndex };
      movePane(paneIndex);
      endPaneDrag();
      return;
    }

    if (dragPaneStateRef.current) {
      movePane(paneIndex);
      endPaneDrag();
      return;
    }

    if (payload?.kind === 'tab') {
      const drag = { tabId: payload.tabId, fromPaneId: payload.fromPaneId };
      moveTabAcrossPanes(paneId, drag);
      dragStateRef.current = null;
      setDragOverPaneIndex(null);
      return;
    }

    moveTabAcrossPanes(paneId, dragStateRef.current);
    dragStateRef.current = null;
    setDragOverPaneIndex(null);
  }, [endPaneDrag, movePane, moveTabAcrossPanes]);

  const paneTemplateStyle = useMemo(() => {
    const total = panes.reduce((sum, pane) => sum + pane.width, 0) || 100;
    return panes.map((pane) => ({
      ...pane,
      widthPercent: (pane.width / total) * 100,
    }));
  }, [panes]);
  const splitterPanels = useMemo(
    () => paneTemplateStyle.map((pane) => ({ id: pane.id, minSize: MIN_PANE_PERCENT })),
    [paneTemplateStyle],
  );

  const openPanels = useMemo(() => {
    const values = new Set<PaneTabId>();
    panes.forEach((pane) => pane.tabs.forEach((tabId) => values.add(tabId)));
    return values;
  }, [panes]);

  const focusedPane = useMemo(
    () => panes.find((pane) => pane.id === focusedPaneId) ?? panes[0] ?? null,
    [focusedPaneId, panes],
  );

  return (
    <div className="flow-workbench-shell flex flex-col gap-2">
      <div className="flow-workbench-toolbar">
        <div className="flow-workbench-toolbar-panels" role="toolbar" aria-label="Edit panels">
          {PANEL_BUTTONS.map((panel) => {
            const isOpen = openPanels.has(panel.tabId);
            const isActiveInFocusedPane = focusedPane?.activeTab === panel.tabId;
            return (
              <button
                key={panel.tabId}
                type="button"
                className={`flow-workbench-panel-button${isOpen ? ' is-open' : ''}${isActiveInFocusedPane ? ' is-focused' : ''}`}
                onClick={() => openPanelFromToolbar(panel.tabId)}
              >
                <panel.Icon size={13} />
                <span>{panel.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flow-workbench-toolbar-actions">
          <Switch.Root
            checked={playgroundOpen}
            onCheckedChange={(details) => setPlaygroundOpen(details.checked)}
            className="flow-workbench-playground-toggle"
          >
            <Switch.Control className="flow-workbench-switch-control">
              <Switch.Thumb className="flow-workbench-switch-thumb" />
            </Switch.Control>
            <Switch.Label className="flow-workbench-switch-label">Playground</Switch.Label>
            <Switch.HiddenInput />
          </Switch.Root>

          <Tooltip.Root openDelay={400} closeDelay={100}>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                aria-label="Validate flow"
                className="flow-workbench-validate-button"
                onClick={() => { void handleValidateFlow(); }}
                disabled={isValidating}
              >
                <IconCheck size={14} />
              </button>
            </Tooltip.Trigger>
            <Portal>
              <Tooltip.Positioner>
                <Tooltip.Content className="flow-workbench-tooltip">
                  Validate flow
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Portal>
          </Tooltip.Root>

          <MenuRoot positioning={{ placement: 'bottom-end', offset: { mainAxis: 6 } }}>
            <MenuTrigger className="flow-workbench-actions-trigger">
              Actions
            </MenuTrigger>
            <MenuPortal>
              <MenuPositioner>
                <MenuContent>
                  <MenuItem value="export-flow" onClick={handleExportFlow}>Export flow</MenuItem>
                  <MenuItem value="delete-flow" onClick={handleDeleteFlow}>Delete</MenuItem>
                </MenuContent>
              </MenuPositioner>
            </MenuPortal>
          </MenuRoot>

          <Clipboard.Root value={codeDraft} onStatusChange={onCopyStatusChange}>
            <Clipboard.Trigger className="flow-workbench-copy-button">
              <Clipboard.Indicator copied={<IconCheck size={14} />}>
                <IconCode size={14} />
              </Clipboard.Indicator>
              <span>Copy</span>
            </Clipboard.Trigger>
          </Clipboard.Root>

          {isDirty ? (
            <span className="flow-workbench-dirty-indicator" role="status">
              Unsaved changes
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => { void handleSaveFlow(); }}
            disabled={isSaving || codeDraft.trim().length === 0 || !isDirty}
            className="flow-workbench-save-button"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {actionNotice ? (
        <div className="flow-workbench-action-notice" role="status">
          <span>{actionNotice}</span>
          <button
            type="button"
            aria-label="Dismiss notice"
            className="flow-workbench-action-notice-dismiss"
            onClick={() => setActionNotice(null)}
          >
            <IconX size={12} />
          </button>
        </div>
      ) : null}
      {validationIssues.length > 0 ? (
        <div className="flow-workbench-validation-issues" role="alert">
          <p className="flow-workbench-validation-title">Validation issues</p>
          <ul className="flow-workbench-validation-list">
            {validationIssues.map((issue, index) => {
              const message = typeof issue.message === 'string' && issue.message.length > 0
                ? issue.message
                : 'Invalid flow source';
              const path = typeof issue.path === 'string' && issue.path.length > 0
                ? `${issue.path}: `
                : '';
              return (
                <li key={`issue-${index}-${path}${message}`}>
                  {path}{message}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <Splitter.Root
        className="flow-workbench-multipane"
        orientation="horizontal"
        panels={splitterPanels}
        size={paneTemplateStyle.map((pane) => pane.widthPercent)}
        onResize={({ size }) => {
          setPanes((current) => {
            if (!Array.isArray(size) || size.length !== current.length) return current;
            const next = current.map((pane, index) => {
              const width = size[index];
              return {
                ...pane,
                width: Number.isFinite(width) ? width : pane.width,
              };
            });
            return normalizePaneWidths(next);
          });
        }}
      >
        {paneTemplateStyle.map((pane, index) => (
          <Fragment key={pane.id}>
            <Splitter.Panel
              id={pane.id}
              data-flow-pane-index={index}
              className={`flow-workbench-pane${dragOverPaneIndex === index ? ' is-pane-dragover' : ''}`}
              onPointerDown={() => setFocusedPaneId(pane.id)}
              onDragOver={(event) => handlePaneDragOver(event, index)}
              onDrop={(event) => handlePaneDrop(event, index, pane.id)}
            >
              <div
                className="flow-workbench-pane-tabs"
                onDragOver={(event) => handlePaneDragOver(event, index)}
                onDrop={(event) => handlePaneDrop(event, index, pane.id)}
              >
                <button
                  type="button"
                  aria-label="Move column"
                  title="Drag to move column"
                  draggable
                  onDragStart={(event) => {
                    dragPaneStateRef.current = { fromIndex: index };
                    dragStateRef.current = null;
                    event.dataTransfer.effectAllowed = 'move';
                    const payload = `pane:${index}`;
                    event.dataTransfer.setData(DRAG_PAYLOAD_MIME, payload);
                    event.dataTransfer.setData('text/plain', payload);
                    setDragOverPaneIndex(index);
                  }}
                  onDragEnd={endPaneDrag}
                  onPointerDown={(event) => startPointerPaneDrag(event, index)}
                  onPointerUp={endPointerPaneDrag}
                  onPointerCancel={endPointerPaneDrag}
                  className="flow-workbench-pane-grip"
                />
                <div className="flow-workbench-tab-list">
                  {pane.tabs.map((tabId) => (
                    <div
                      key={`${pane.id}-${tabId}`}
                      className={`flow-workbench-tab${pane.activeTab === tabId ? ' is-active' : ''}`}
                      draggable
                      onDragStart={(event) => {
                        dragStateRef.current = { tabId, fromPaneId: pane.id };
                        dragPaneStateRef.current = null;
                        event.dataTransfer.effectAllowed = 'move';
                        const payload = `tab:${pane.id}:${tabId}`;
                        event.dataTransfer.setData(DRAG_PAYLOAD_MIME, payload);
                        event.dataTransfer.setData('text/plain', payload);
                      }}
                      onDragEnd={() => {
                        dragStateRef.current = null;
                      }}
                    >
                      <button
                        type="button"
                        className="flow-workbench-tab-button"
                        onClick={() => setActiveTab(pane.id, tabId)}
                      >
                        {tabLabel(tabId)}
                      </button>
                      <button
                        type="button"
                        aria-label={`Close ${tabLabel(tabId)} tab`}
                        className="flow-workbench-tab-close"
                        onClick={() => closeTabOrColumn(pane, tabId)}
                      >
                        <IconX size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flow-workbench-pane-actions">
                  <button
                    type="button"
                    title="Split panel"
                    aria-label="Split panel"
                    onClick={() => splitPanel(index)}
                    className="flow-workbench-pane-split-trigger"
                  >
                    <IconLayoutColumns size={14} />
                  </button>

                  <MenuRoot positioning={{ placement: 'bottom-end', offset: { mainAxis: 6 } }}>
                    <MenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Pane actions"
                        className="flow-workbench-pane-menu-trigger"
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
                            onClick={() => removeColumn(pane.id)}
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

              <div
                className="flow-workbench-pane-content"
                onDragOver={(event) => handlePaneDragOver(event, index)}
                onDrop={(event) => handlePaneDrop(event, index, pane.id)}
              >
                {renderTabContent(
                  pane.activeTab,
                  flowName,
                  codeDraft,
                  setCodeDraft,
                  monacoTheme,
                  filesSaveKey,
                )}
              </div>
            </Splitter.Panel>

            {index < paneTemplateStyle.length - 1 && (
              <Splitter.ResizeTrigger
                key={`${pane.id}-resizer`}
                id={`${pane.id}:${paneTemplateStyle[index + 1].id}`}
                aria-label="Resize pane"
                className="flow-workbench-resizer"
              >
                <Splitter.ResizeTriggerIndicator
                  id={`${pane.id}:${paneTemplateStyle[index + 1].id}`}
                  className="flow-workbench-resizer-indicator"
                />
              </Splitter.ResizeTrigger>
            )}
          </Fragment>
        ))}
      </Splitter.Root>
      {playgroundOpen ? (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          Playground mode is enabled. Inline run output will be connected to backend execution streams.
        </div>
      ) : null}
    </div>
  );
}
