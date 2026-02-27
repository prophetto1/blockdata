import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconCheck,
  IconCode,
  IconDotsVertical,
  IconFileText,
  IconFolder,
  IconLayoutColumns,
  IconPlayerPlay,
  IconX,
} from '@tabler/icons-react';
import {
  MenuContent,
  MenuItem,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogRoot,
  DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clipboard } from '@ark-ui/react/clipboard';
import { FileUpload as ArkFileUpload } from '@ark-ui/react/file-upload';
import { Portal } from '@ark-ui/react/portal';
import { Splitter } from '@ark-ui/react/splitter';
import { Switch } from '@ark-ui/react/switch';
import { Tooltip } from '@ark-ui/react/tooltip';
import { TreeView, createTreeCollection, type TreeNode } from '@ark-ui/react/tree-view';
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
const MAX_COLUMNS = 4;
const SAVE_KEY_PREFIX = 'flow-workbench-layout';
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

type FileTreeNode = TreeNode & {
  id: string;
  label: string;
  path: string;
  isFile?: boolean;
  children?: FileTreeNode[];
};

type FileTreeEntry = {
  path: string;
  isFile: boolean;
};

type MutableFileTreeNode = {
  id: string;
  label: string;
  path: string;
  isFile: boolean;
  children: Map<string, MutableFileTreeNode>;
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

    return normalizePaneWidths(normalized.slice(0, MAX_COLUMNS));
  } catch {
    return null;
  }
}

function getUploadedPath(file: File): string {
  const withRelative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const next = (withRelative && withRelative.trim().length > 0) ? withRelative : file.name;
  return next.replace(/^\/+/, '');
}

function buildFileTreeNodes(entries: FileTreeEntry[]): FileTreeNode[] {
  const root: MutableFileTreeNode = {
    id: 'files-root',
    label: 'Files',
    path: '',
    isFile: false,
    children: new Map(),
  };

  for (const entry of entries) {
    const normalizedPath = entry.path.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    if (!normalizedPath) continue;
    const segments = normalizedPath.split('/').filter(Boolean);
    if (segments.length === 0) continue;

    let current = root;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const path = current.path ? `${current.path}/${segment}` : segment;
      const existing = current.children.get(segment);
      if (existing) {
        if (index === segments.length - 1) {
          existing.isFile = true;
        }
        current = existing;
        continue;
      }

      const nextNode: MutableFileTreeNode = {
        id: `file:${path}`,
        label: segment,
        path,
        isFile: false,
        children: new Map(),
      };
      current.children.set(segment, nextNode);
      current = nextNode;
    }

    current.isFile = entry.isFile;
  }

  const toNodes = (input: Map<string, MutableFileTreeNode>): FileTreeNode[] => Array.from(input.values())
    .sort((left, right) => {
      const leftIsFile = left.children.size === 0 && left.isFile;
      const rightIsFile = right.children.size === 0 && right.isFile;
      if (leftIsFile !== rightIsFile) {
        return leftIsFile ? 1 : -1;
      }
      return left.label.localeCompare(right.label);
    })
    .map((node) => ({
      id: node.id,
      label: node.label,
      path: node.path,
      isFile: node.children.size === 0 && node.isFile,
      children: node.children.size > 0 ? toNodes(node.children) : undefined,
    }));

  return toNodes(root.children);
}

function FilesTree({ acceptedFiles }: { acceptedFiles: File[] }) {
  const [createdEntries, setCreatedEntries] = useState<FileTreeEntry[]>([]);
  const uploadedEntries = useMemo<FileTreeEntry[]>(
    () => acceptedFiles
      .map((file) => ({ path: getUploadedPath(file), isFile: true }))
      .filter((entry) => entry.path.length > 0),
    [acceptedFiles],
  );
  const allEntries = useMemo(() => {
    const map = new Map<string, FileTreeEntry>();
    uploadedEntries.forEach((entry) => map.set(entry.path, entry));
    createdEntries.forEach((entry) => map.set(entry.path, entry));
    return Array.from(map.values());
  }, [createdEntries, uploadedEntries]);
  const treeNodes = useMemo(() => buildFileTreeNodes(allEntries), [allEntries]);
  const fileNodeIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (nodes: FileTreeNode[]) => {
      nodes.forEach((node) => {
        if (node.isFile) {
          ids.push(node.id);
          return;
        }
        if (node.children) walk(node.children);
      });
    };
    walk(treeNodes);
    return ids;
  }, [treeNodes]);

  const collection = useMemo(() => createTreeCollection<FileTreeNode>({
    rootNode: {
      id: 'root',
      label: 'Files',
      path: '',
      children: treeNodes,
    },
    nodeToValue: (node) => node.id,
    nodeToString: (node) => node.label,
    nodeToChildren: (node) => node.children ?? [],
  }), [treeNodes]);

  const [selectedValue, setSelectedValue] = useState<string[]>([]);
  const [expandedValue, setExpandedValue] = useState<string[]>([]);
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [createFileName, setCreateFileName] = useState('');

  useEffect(() => {
    setSelectedValue((current) => current.filter((id) => fileNodeIds.includes(id)));
  }, [fileNodeIds]);

  useEffect(() => {
    const nextExpanded: string[] = [];
    const walk = (nodes: FileTreeNode[]) => {
      nodes.forEach((node) => {
        if (!node.isFile) {
          nextExpanded.push(node.id);
          if (node.children) walk(node.children);
        }
      });
    };
    walk(treeNodes);
    setExpandedValue(nextExpanded);
  }, [treeNodes]);

  const selectedNode = selectedValue[0]
    ? collection.findNode(selectedValue[0]) as FileTreeNode | null
    : null;

  const onCreateFile = useCallback(() => {
    const nextPath = createFileName.trim().replace(/^\/+/, '');
    if (!nextPath) return;

    setCreatedEntries((current) => (
      current.some((entry) => entry.path === nextPath)
        ? current
        : [...current, { path: nextPath, isFile: true }]
    ));
    setSelectedValue([`file:${nextPath}`]);
    setCreateFileName('');
    setCreateFileOpen(false);
  }, [createFileName]);

  return (
    <DialogRoot
      open={createFileOpen}
      onOpenChange={(details) => {
        setCreateFileOpen(details.open);
        if (!details.open) {
          setCreateFileName('');
        }
      }}
    >
      <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Files</p>
        <div className="flex items-center gap-2">
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={() => setCreateFileOpen(true)}
              className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Create file
            </button>
          </DialogTrigger>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-2">
        <TreeView.Root
          collection={collection}
          selectionMode="single"
          selectedValue={selectedValue}
          expandedValue={expandedValue}
          onExpandedChange={(details) => setExpandedValue(details.expandedValue)}
          onSelectionChange={(details) => setSelectedValue(details.selectedValue)}
        >
          <TreeView.Tree className="space-y-1" aria-label="Files tree">
            <TreeView.Context>
              {(tree) => tree.getVisibleNodes().map((entry) => {
                const node = entry.node as FileTreeNode;
                if (node.id === 'root') return null;
                const rowPaddingLeft = `${Math.max(0, entry.indexPath.length - 1) * 12}px`;

                return (
                  <TreeView.NodeProvider key={node.id} node={node} indexPath={entry.indexPath}>
                    <TreeView.NodeContext>
                      {(state) => {
                        const className = `flex h-8 items-center rounded px-2 text-xs ${
                          state.selected
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`;

                        if (state.isBranch) {
                          return (
                            <TreeView.Branch>
                              <TreeView.BranchControl className={className} style={{ paddingLeft: rowPaddingLeft }}>
                                <TreeView.BranchText className="truncate">
                                  {node.label}
                                </TreeView.BranchText>
                              </TreeView.BranchControl>
                            </TreeView.Branch>
                          );
                        }

                        return (
                          <TreeView.Item className={className} style={{ paddingLeft: rowPaddingLeft }}>
                            <TreeView.ItemText className="truncate">
                              {node.label}
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

      {acceptedFiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No files uploaded yet.
        </p>
      ) : selectedNode?.isFile ? (
        <p className="text-xs text-muted-foreground">
          Selected: {selectedNode.path}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Select a file to preview.
        </p>
      )}

        <DialogContent className="w-[26rem]">
          <DialogTitle>Create file</DialogTitle>
          <DialogCloseTrigger />
          <DialogBody>
            <label htmlFor="flow-workbench-create-file-name" className="text-sm text-muted-foreground">
              File name
            </label>
            <input
              id="flow-workbench-create-file-name"
              aria-label="File name"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={createFileName}
              onChange={(event) => setCreateFileName(event.currentTarget.value)}
            />
          </DialogBody>
          <DialogFooter>
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                setCreateFileOpen(false);
                setCreateFileName('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
              disabled={createFileName.trim().length === 0}
              onClick={onCreateFile}
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </div>
    </DialogRoot>
  );
}

function renderTabContent(
  tabId: PaneTabId,
  flowName: string,
  codeDraft: string,
  setCodeDraft: (next: string) => void,
) {
  switch (tabId) {
    case 'flowCode':
      return (
        <div className="flow-workbench-code-panel">
          <textarea
            aria-label="Flow code editor"
            className="flow-workbench-code-textarea"
            value={codeDraft}
            onChange={(event) => setCodeDraft(event.currentTarget.value)}
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
        <ArkFileUpload.Root maxFiles={20} allowDrop={false} className="space-y-3 p-3">
          <div className="flex items-center justify-end gap-3">
            <ArkFileUpload.Trigger className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground">
              Upload file
            </ArkFileUpload.Trigger>
          </div>
          <ArkFileUpload.Context>
            {({ acceptedFiles }) => (
              <>
                <FilesTree acceptedFiles={acceptedFiles} />
                {acceptedFiles.length > 0 ? (
                  <ArkFileUpload.ItemGroup className="space-y-2">
                    {acceptedFiles.map((file) => (
                      <ArkFileUpload.Item
                        key={file.name}
                        file={file}
                        className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
                      >
                        <div className="min-w-0">
                          <ArkFileUpload.ItemName className="truncate text-sm font-medium text-foreground" />
                          <ArkFileUpload.ItemSizeText className="text-xs text-muted-foreground" />
                        </div>
                        <ArkFileUpload.ItemDeleteTrigger className="inline-flex items-center rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                          Remove
                        </ArkFileUpload.ItemDeleteTrigger>
                      </ArkFileUpload.Item>
                    ))}
                  </ArkFileUpload.ItemGroup>
                ) : null}
              </>
            )}
          </ArkFileUpload.Context>
          <ArkFileUpload.HiddenInput aria-label="Upload files input" />
        </ArkFileUpload.Root>
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
  const flowPath = useMemo(
    () => `flows/${encodeURIComponent(namespace)}/${encodeURIComponent(flowId)}`,
    [flowId, namespace],
  );

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
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        const nextNotice = `Unable to load flow source: ${message}`;
        setActionNotice((current) => (current === nextNotice ? current : nextNotice));
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
      if (!panel || panel.tabs.length <= 1 || current.length >= MAX_COLUMNS) return current;

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
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setActionNotice(`Validation failed: ${message}`);
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
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setActionNotice(`Save failed: ${message}`);
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

  const startPaneDrag = useCallback((event: React.DragEvent<HTMLButtonElement>, fromIndex: number) => {
    dragPaneStateRef.current = { fromIndex };
    dragStateRef.current = null;
    pointerPaneStateRef.current = null;
    event.dataTransfer.effectAllowed = 'move';
    const payload = `pane:${fromIndex}`;
    event.dataTransfer.setData(DRAG_PAYLOAD_MIME, payload);
    event.dataTransfer.setData('text/plain', payload);
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
        onResizeEnd={({ size }) => {
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
                  draggable={false}
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

                {pane.tabs.length > 1 ? (
                  <button
                    type="button"
                    title="Split panel"
                    aria-label="Split panel"
                    onClick={() => splitPanel(index)}
                    disabled={panes.length >= MAX_COLUMNS}
                    className="flow-workbench-pane-split-trigger"
                  >
                    <IconLayoutColumns size={14} />
                  </button>
                ) : null}

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

              <div
                className="flow-workbench-pane-content"
                onDragOver={(event) => handlePaneDragOver(event, index)}
                onDrop={(event) => handlePaneDrop(event, index, pane.id)}
              >
                {renderTabContent(pane.activeTab, flowName, codeDraft, setCodeDraft)}
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
