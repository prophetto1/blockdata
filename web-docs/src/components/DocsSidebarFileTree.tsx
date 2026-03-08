import { TreeView, createTreeCollection } from '@ark-ui/react/tree-view';
import {
  AlertCircle,
  ChevronRight,
  File,
  FileCode2,
  FileText,
  FolderClosed,
  FolderOpen,
  RefreshCw,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FILE_STORAGE_KEY,
  resetSelectedFile,
  selectFile,
  type ShellFileSourceKind,
} from '../lib/docs/shell-state';
import {
  clearLocalFileHandles,
  clearSavedDirectoryHandle,
  getLocalHandleId,
  restoreDirectoryHandle,
  saveDirectoryHandle,
  saveLocalFileHandle,
} from '../lib/docs/local-file-handles';

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }
  interface FileSystemDirectoryHandle {
    queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  }
  interface FileSystemFileHandle {
    getFile(): Promise<File>;
  }
}

type RepoTreeNode = {
  id: string;
  name: string;
  relativePath: string;
  docsHref?: string;
  extension?: string;
  children?: RepoTreeNode[];
};

export type DocsSidebarTreeNode = {
  id: string;
  name: string;
  relativePath: string;
  sourceKind: ShellFileSourceKind;
  docsHref?: string;
  extension?: string;
  localHandleId?: string;
  children?: DocsSidebarTreeNode[];
};

type DocsSidebarFileTreeProps = {
  nodes: RepoTreeNode[];
  currentRelativePath?: string;
};

const ICON_SIZE = 16;
const ICON_STROKE = 2.25;
const SUPPORTED_LOCAL_EXTENSIONS = new Set(['.md', '.mdx']);

function getExtension(name: string) {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return '';
  return name.slice(dot).toLowerCase();
}

function isSupportedLocalFile(extension: string) {
  return SUPPORTED_LOCAL_EXTENSIONS.has(extension);
}

async function readDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string = '',
): Promise<DocsSidebarTreeNode[]> {
  const entries: DocsSidebarTreeNode[] = [];

  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.')) continue;

    const childPath = relativePath ? `${relativePath}/${name}` : name;

    if (handle.kind === 'directory') {
      const children = await readDirectoryHandle(
        handle as FileSystemDirectoryHandle,
        childPath,
      );
      entries.push({
        id: `dir:${childPath}`,
        name,
        relativePath: childPath,
        sourceKind: 'local',
        children,
      });
    } else {
      const extension = getExtension(name);
      if (!isSupportedLocalFile(extension)) continue;

      const localHandleId = getLocalHandleId(childPath);
      await saveLocalFileHandle(localHandleId, handle as FileSystemFileHandle);

      entries.push({
        id: `file:${childPath}`,
        name,
        relativePath: childPath,
        sourceKind: 'local',
        extension,
        localHandleId,
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.children && !b.children) return -1;
    if (!a.children && b.children) return 1;
    return a.name.localeCompare(b.name);
  });
}

function EmptyState({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="docs-tree-empty">
      <FolderOpen size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <span>No folder selected</span>
      <button type="button" className="docs-tree-empty__button" onClick={onSelect}>
        Select Folder
      </button>
    </div>
  );
}

function ReauthState({ folderName, onReconnect, onClear }: { folderName: string; onReconnect: () => void; onClear: () => void }) {
  return (
    <div className="docs-tree-empty">
      <FolderOpen size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <span>Folder access expired</span>
      <span className="docs-tree-empty__detail">{folderName}</span>
      <button type="button" className="docs-tree-empty__button" onClick={onReconnect}>
        <RefreshCw size={12} strokeWidth={ICON_STROKE} aria-hidden="true" />
        Reconnect
      </button>
      <button type="button" className="docs-tree-empty__button docs-tree-empty__button--muted" onClick={onClear}>
        Dismiss
      </button>
    </div>
  );
}

function FolderErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="docs-tree-empty">
      <AlertCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" className="docs-tree-empty__button" onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}

function TreeHeader({
  folderName,
  onClear,
}: {
  folderName: string;
  onClear?: () => void;
}) {
  return (
    <div className="docs-tree-header">
      <span className="docs-tree-header__name" title={folderName}>
        {folderName}
      </span>
      {onClear && (
        <div className="docs-tree-header__actions">
          <button
            type="button"
            className="docs-tree-header__button"
            onClick={onClear}
            title="Close folder"
            aria-label="Close folder"
          >
            <X size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function DocsSidebarFileTree({
  nodes: serverNodes,
  currentRelativePath = '',
}: DocsSidebarFileTreeProps) {
  const [localNodes, setLocalNodes] = useState<DocsSidebarTreeNode[] | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [folderError, setFolderError] = useState('');

  const hasLocalFolder = localNodes !== null;
  const activeNodes = useMemo(
    () => (hasLocalFolder ? localNodes : enrichRepoNodes(serverNodes)),
    [hasLocalFolder, localNodes, serverNodes],
  );

  const reconnectFolder = useCallback(async () => {
    setFolderError('');
    try {
      const handle = await restoreDirectoryHandle();
      if (!handle) {
        setNeedsReauth(false);
        clearSavedDirectoryHandle();
        return;
      }
      // requestPermission triggers the browser prompt
      const perm = await (handle as any).requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      const children = await readDirectoryHandle(handle);
      setFolderName(handle.name);
      setLocalNodes(children);
      setNeedsReauth(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not reconnect folder';
      setFolderError(message);
    }
  }, []);

  useEffect(() => {
    restoreDirectoryHandle().then(async (handle) => {
      if (!handle) return;
      try {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const children = await readDirectoryHandle(handle);
          setFolderName(handle.name);
          setLocalNodes(children);
        } else {
          // Permission expired — show reconnect UI instead of silently dropping
          setFolderName(handle.name);
          setNeedsReauth(true);
        }
      } catch {
        setFolderName(handle.name);
        setNeedsReauth(true);
      }
    });
  }, []);

  const selectFolder = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      setFolderError('Your browser does not support the File System Access API.');
      return;
    }
    setFolderError('');
    try {
      await clearLocalFileHandles();
      const handle = await window.showDirectoryPicker!({ mode: 'readwrite' });
      const children = await readDirectoryHandle(handle);
      setFolderName(handle.name);
      setLocalNodes(children);
      setNeedsReauth(false);
      saveDirectoryHandle(handle);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Could not open folder';
      setFolderError(message);
    }
  }, []);

  const clearFolder = useCallback(() => {
    setLocalNodes(null);
    setFolderName(null);
    clearSavedDirectoryHandle();
    clearLocalFileHandles();
    try {
      sessionStorage.removeItem(FILE_STORAGE_KEY);
    } catch {}
    resetSelectedFile({ reason: 'folder-cleared' });
  }, []);

  const rootNode = useMemo<DocsSidebarTreeNode>(
    () => ({
      id: 'dir:root',
      name: folderName || 'docs',
      relativePath: '',
      sourceKind: 'repo',
      children: activeNodes,
    }),
    [activeNodes, folderName],
  );

  const collection = useMemo(
    () =>
      createTreeCollection<DocsSidebarTreeNode>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.name,
        rootNode,
      }),
    [rootNode],
  );

  const defaultExpandedValue = useMemo(
    () => (hasLocalFolder ? [] : getExpandedBranchIds(serverNodes, currentRelativePath)),
    [hasLocalFolder, serverNodes, currentRelativePath],
  );

  const defaultSelectedValue = useMemo(
    () => (hasLocalFolder ? null : getSelectedNodeId(serverNodes, currentRelativePath)),
    [hasLocalFolder, serverNodes, currentRelativePath],
  );

  if (folderError) {
    return <FolderErrorState message={folderError} onRetry={selectFolder} />;
  }

  if (needsReauth && !hasLocalFolder) {
    return <ReauthState folderName={folderName || 'Local folder'} onReconnect={reconnectFolder} onClear={clearFolder} />;
  }

  if (!activeNodes.length && !hasLocalFolder) {
    return <EmptyState onSelect={selectFolder} />;
  }

  return (
    <div className="docs-tree-container">
      <TreeHeader
        folderName={hasLocalFolder && folderName ? folderName : 'docs'}
        onClear={hasLocalFolder ? clearFolder : undefined}
      />
      <TreeView.Root
        aria-label="File tree"
        className="docs-tree"
        collection={collection}
        defaultExpandedValue={defaultExpandedValue}
        defaultSelectedValue={defaultSelectedValue ? [defaultSelectedValue] : []}
        selectionMode="single"
        expandOnClick={false}
      >
        <TreeView.Tree className="docs-tree__list">
          {collection.rootNode.children?.map((node, index) => (
            <TreeNodeView key={node.id} node={node} indexPath={[index]} />
          ))}
        </TreeView.Tree>
      </TreeView.Root>
    </div>
  );
}

function TreeNodeView(props: TreeView.NodeProviderProps<DocsSidebarTreeNode>) {
  const { node, indexPath } = props;

  return (
    <TreeView.NodeProvider node={node} indexPath={indexPath}>
      <TreeView.NodeContext>
        {() =>
          isDirectoryNode(node) ? (
            <TreeView.Branch className="docs-tree__branch">
              <TreeView.BranchControl className="docs-tree__branch-control">
                <TreeView.BranchTrigger className="docs-tree__row docs-tree__row--branch">
                  <TreeView.BranchIndicator className="docs-tree__chevron">
                    <ChevronRight size={ICON_SIZE} strokeWidth={ICON_STROKE} />
                  </TreeView.BranchIndicator>
                  <TreeView.BranchText className="docs-tree__label">
                    <FolderClosed
                      size={ICON_SIZE}
                      strokeWidth={ICON_STROKE}
                      className="docs-tree-icon docs-tree-icon--folder-closed"
                    />
                    <FolderOpen
                      size={ICON_SIZE}
                      strokeWidth={ICON_STROKE}
                      className="docs-tree-icon docs-tree-icon--folder-open"
                    />
                    <span className="docs-tree__name">{node.name}</span>
                  </TreeView.BranchText>
                </TreeView.BranchTrigger>
              </TreeView.BranchControl>

              <TreeView.BranchContent className="docs-tree__children">
                <TreeView.BranchIndentGuide className="docs-tree__guide" />
                {(node.children ?? []).map((child, index) => (
                  <TreeNodeView
                    key={child.id}
                    node={child}
                    indexPath={[...indexPath, index]}
                  />
                ))}
              </TreeView.BranchContent>
            </TreeView.Branch>
          ) : (
            <TreeView.Item className="docs-tree__item">
              <button
                type="button"
                className="docs-tree__row docs-tree__row--file"
                onClick={() => {
                  selectFile({
                    filePath: node.relativePath,
                    extension: node.extension || '',
                    sourceKind: node.sourceKind ?? 'repo',
                    docsHref: node.docsHref,
                    localHandleId: node.localHandleId,
                  });
                }}
              >
                <TreeView.ItemText className="docs-tree__label">
                  {node.extension === '.mdx' ? (
                    <FileCode2 size={ICON_SIZE} strokeWidth={ICON_STROKE} className="docs-tree-icon docs-tree-icon--markdown" />
                  ) : node.extension === '.md' ? (
                    <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} className="docs-tree-icon docs-tree-icon--markdown" />
                  ) : (
                    <File size={ICON_SIZE} strokeWidth={ICON_STROKE} className="docs-tree-icon docs-tree-icon--file" />
                  )}
                  <span className="docs-tree__name">{stripExtension(node.name)}</span>
                  <span className="docs-tree__ext">{node.extension}</span>
                </TreeView.ItemText>
              </button>
            </TreeView.Item>
          )
        }
      </TreeView.NodeContext>
    </TreeView.NodeProvider>
  );
}

function isDirectoryNode(node: DocsSidebarTreeNode) {
  return node.id.startsWith('dir:');
}

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

function enrichRepoNodes(nodes: RepoTreeNode[]): DocsSidebarTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    sourceKind: 'repo',
    extension: node.extension?.toLowerCase(),
    children: node.children ? enrichRepoNodes(node.children as RepoTreeNode[]) : undefined,
  }));
}

function getExpandedBranchIds(nodes: RepoTreeNode[], currentRelativePath: string) {
  const expandedIds: string[] = [];

  function visit(list: RepoTreeNode[]) {
    for (const node of list) {
      if (!node.children?.length) continue;
      if (currentRelativePath.startsWith(`${node.relativePath}/`)) {
        expandedIds.push(node.id);
        visit(node.children);
      }
    }
  }

  visit(nodes);
  return expandedIds;
}

function getSelectedNodeId(nodes: RepoTreeNode[], currentRelativePath: string): string | null {
  for (const node of nodes) {
    if (node.children?.length) {
      const childSelectedId = getSelectedNodeId(node.children, currentRelativePath);
      if (childSelectedId) return childSelectedId;
      continue;
    }

    if (node.relativePath === currentRelativePath) return node.id;
  }

  return null;
}
