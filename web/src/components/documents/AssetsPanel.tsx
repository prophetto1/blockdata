import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { TreeView, createTreeCollection } from '@ark-ui/react/tree-view';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  IconFilePlus,
  IconFileText,
  IconFolder,
  IconFolderPlus,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import {
  type ProjectDocumentRow,
  formatBytes,
  getDocumentFormat,
} from '@/lib/projectDetailHelpers';
import {
  type FilesTreeNode,
  normalizePath,
  joinPath,
  ensureFileExtension,
  getDocumentFolderPath,
  buildFilesTreeNodes,
  collectFolderNodeIds,
  findFirstPreviewableSourceUid,
  findFilesTreeNodeById,
} from '@/lib/filesTree';
import { readStoredVirtualFolders, writeStoredVirtualFolders } from '@/lib/virtualFolders';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssetsPanelProps = {
  projectId: string | null;
  docs: ProjectDocumentRow[];
  docsLoading: boolean;
  docsError: string | null;
  selectedSourceUid: string | null;
  onSelectFile: (sourceUid: string) => void;
  onDeleteSelected: () => void;
  onUploadFiles: (files: FileList | null) => Promise<void>;
  onCreateEntry: (name: string, type: 'file' | 'folder') => void;
  /** Which source_uid is valid for destructive actions (delete). */
  selectedSourceUidForActions: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssetsPanel({
  projectId,
  docs,
  docsLoading,
  docsError,
  selectedSourceUid,
  onSelectFile,
  onDeleteSelected,
  onUploadFiles,
  onCreateEntry,
  selectedSourceUidForActions,
}: AssetsPanelProps) {
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [createName, setCreateName] = useState('');
  const [virtualFolders, setVirtualFolders] = useState<string[]>([]);
  const [expandedValue, setExpandedValue] = useState<string[]>([]);
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string | null>(null);
  const expandedInitRef = useRef(false);

  const supportsDirectoryUpload = useMemo(() => {
    if (typeof document === 'undefined') return false;
    const input = document.createElement('input') as HTMLInputElement & { webkitdirectory?: string };
    return 'webkitdirectory' in input;
  }, []);

  // ── Filtered docs & tree ────────────────────────────────────────────────

  const filesTreeNodes = useMemo(
    () => buildFilesTreeNodes(docs, virtualFolders),
    [docs, virtualFolders],
  );
  const filesTreeCollection = useMemo(() => createTreeCollection<FilesTreeNode>({
    nodeToValue: (node) => node.id,
    nodeToString: (node) => node.label,
    rootNode: { id: 'root', label: '', kind: 'folder', children: filesTreeNodes } as FilesTreeNode,
  }), [filesTreeNodes]);
  const folderNodeIds = useMemo(() => collectFolderNodeIds(filesTreeNodes), [filesTreeNodes]);
  const hasFilesTreeNodes = filesTreeNodes.length > 0;

  // ── Virtual folder persistence ──────────────────────────────────────────

  useEffect(() => {
    setVirtualFolders(readStoredVirtualFolders(projectId));
  }, [projectId]);

  useEffect(() => {
    writeStoredVirtualFolders(projectId, virtualFolders);
  }, [projectId, virtualFolders]);

  // ── Reset on project change ─────────────────────────────────────────────

  useEffect(() => {
    expandedInitRef.current = false;
    setExpandedValue([]);
    setSelectedTreeNodeId(null);
  }, [projectId]);

  useEffect(() => {
    if (!expandedInitRef.current) {
      setExpandedValue(folderNodeIds);
      expandedInitRef.current = true;
      return;
    }
    setExpandedValue((current) => current.filter((id) => folderNodeIds.includes(id)));
  }, [folderNodeIds]);

  // ── Resolved selected source uid ────────────────────────────────────────

  const resolvedSelectedSourceUid = useMemo(() => {
    if (selectedSourceUid && docs.some((doc) => doc.source_uid === selectedSourceUid)) {
      return selectedSourceUid;
    }
    return docs[0]?.source_uid ?? null;
  }, [selectedSourceUid, docs]);

  // ── Active folder path ─────────────────────────────────────────────────

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

  // ── File picker ─────────────────────────────────────────────────────────

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
      void onUploadFiles(transientInput.files);
      transientInput.remove();
    };
    document.body.appendChild(transientInput);
    tryOpen(transientInput);
  }, [onUploadFiles]);

  // ── Create entry handler ────────────────────────────────────────────────

  const handleCreateEntry = useCallback(
    (name: string, type: 'file' | 'folder') => {
      if (!name.trim() || !projectId) return;
      const trimmed = normalizePath(name);
      if (!trimmed) return;

      if (type === 'folder') {
        const targetFolderPath = joinPath(activeFolderPath, trimmed);
        if (!targetFolderPath) return;
        setVirtualFolders((prev) => prev.includes(targetFolderPath) ? prev : [...prev, targetFolderPath]);
        setCreatingType(null);
        setCreateName('');
        return;
      }

      const normalizedName = ensureFileExtension(trimmed);
      const targetRelativePath = joinPath(activeFolderPath, normalizedName);
      if (!targetRelativePath) return;

      setCreatingType(null);
      setCreateName('');
      onCreateEntry(targetRelativePath, type);
    },
    [activeFolderPath, projectId, onCreateEntry],
  );

  // ── Tree selection ──────────────────────────────────────────────────────

  const selectedInFiltered = !!resolvedSelectedSourceUid
    && docs.some((doc) => doc.source_uid === resolvedSelectedSourceUid);
  const selectedDocNodeId = selectedInFiltered && resolvedSelectedSourceUid ? `doc:${resolvedSelectedSourceUid}` : null;
  const selectedTreeValue = selectedTreeNodeId && filesTreeCollection.findNode(selectedTreeNodeId)
    ? [selectedTreeNodeId]
    : (selectedDocNodeId ? [selectedDocNodeId] : []);

  // ── No project ─────────────────────────────────────────────────────────

  if (!projectId) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 text-sm text-muted-foreground">
        Select a project from the left rail to load assets.
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="flex min-h-10 items-center justify-end border-b border-border bg-card px-2">
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              title="Add file"
              onClick={() => openNativeFilePicker('file')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <IconFilePlus size={16} />
            </button>
            <button
              type="button"
              title="Add folder"
              onClick={() => {
                if (!supportsDirectoryUpload) return;
                openNativeFilePicker('folder');
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <IconFolderPlus size={16} />
            </button>
            <button
              type="button"
              title="Create file"
              onClick={() => { setCreatingType('file'); setCreateName(''); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <IconPlus size={16} />
            </button>
            <button
              type="button"
              title="Create folder"
              onClick={() => { setCreatingType('folder'); setCreateName(''); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <IconFolder size={16} />
            </button>
            <button
              type="button"
              title="Delete selected"
              disabled={!selectedSourceUidForActions}
              onClick={() => void onDeleteSelected()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-accent/70 hover:text-red-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            >
              <IconTrash size={16} />
            </button>
          </div>
        </div>

        <ScrollArea className="min-h-0 h-full flex-1" viewportClass="h-full overflow-auto bg-background p-2">
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
                    handleCreateEntry(createName, creatingType);
                  }
                  if (e.key === 'Escape') {
                    setCreatingType(null);
                    setCreateName('');
                  }
                }}
                placeholder={creatingType === 'folder' ? 'Folder name' : 'File name'}
                className="h-7 min-w-0 flex-1 border-none bg-transparent text-sm text-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => handleCreateEntry(createName, creatingType)}
                disabled={!createName.trim()}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline"
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

          {!docsLoading && !docsError && !hasFilesTreeNodes ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No assets in this project yet.
            </div>
          ) : null}

          {!docsLoading && !docsError && hasFilesTreeNodes ? (
            <div
              className="h-full"
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                setSelectedTreeNodeId(null);
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
                      onSelectFile(nestedSourceUid);
                      return;
                    }
                    return;
                  }
                  onSelectFile(nextId.slice('doc:'.length));
                }}
                className="text-[13px]"
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
                              const rowClassName = `flex items-center gap-2 rounded-md px-2.5 py-1.5 ${
                                state.selected
                                  ? 'bg-accent/70 text-foreground'
                                  : 'hover:bg-accent/60'
                              }`;
                              const rowStyle: CSSProperties = {
                                paddingLeft: rowPaddingLeft,
                                contentVisibility: 'auto',
                                containIntrinsicSize: '30px',
                              };

                              if (state.isBranch || node.kind === 'folder') {
                                return (
                                  <TreeView.Branch>
                                    <TreeView.BranchControl className={rowClassName} style={rowStyle}>
                                      <IconFolder size={15} className="shrink-0 text-muted-foreground" />
                                      <TreeView.BranchText className="min-w-0 flex-1 truncate text-[13px] text-foreground">
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
                                <TreeView.Item className={rowClassName} style={rowStyle}>
                                  <TreeView.ItemText className="flex w-full min-w-0 items-center gap-2">
                                    <IconFileText size={15} className="shrink-0 text-muted-foreground" />
                                    <span className="min-w-0 max-w-[52%] truncate text-[13px] font-medium text-foreground" title={node.label}>
                                      {node.label}
                                    </span>
                                    <span className="ml-auto inline-flex shrink-0 items-center gap-2">
                                      <span className="w-12 text-right font-mono text-[11px] text-muted-foreground">
                                        {formatBytes(fileDoc.source_filesize)}
                                      </span>
                                      <span className="inline-flex min-w-[34px] justify-center rounded border border-border bg-muted/60 px-1 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                        {getDocumentFormat(fileDoc)}
                                      </span>
                                      <span
                                        className="inline-flex h-3 w-3 items-center justify-center"
                                        aria-label={failed ? 'failed' : 'success'}
                                        title={failed ? 'failed' : 'success'}
                                      >
                                        <span
                                          className={`h-2.5 w-2.5 rounded-full ${
                                            failed
                                              ? 'bg-red-600 dark:bg-red-400'
                                              : 'bg-emerald-600 dark:bg-emerald-400'
                                          }`}
                                        />
                                      </span>
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
        </ScrollArea>
      </div>
    </div>
  );
}
