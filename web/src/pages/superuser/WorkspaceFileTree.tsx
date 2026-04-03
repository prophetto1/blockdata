/**
 * Workspace file tree — Ark UI TreeView backed by the File System Access API.
 * Ported from web-docs/src/components/DocsSidebarFileTree.tsx, generalized
 * for all file types and stripped of docs-specific concerns.
 */
import { type TreeViewNodeProviderProps, TreeViewRoot, TreeViewTree, TreeViewNodeProvider, TreeViewBranch, TreeViewBranchControl, TreeViewBranchTrigger, TreeViewBranchIndicator, TreeViewBranchText, TreeViewBranchContent, TreeViewBranchIndentGuide, TreeViewItem, TreeViewItemText, createTreeCollection } from '@/components/ui/tree-view';
import {
  ChevronRight,
  File,
  FileCode2,
  FilePlus,
  FileText,
  FolderClosed,
  FolderOpen,
  FolderOpenDot,
  FolderPlus,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type FsNode,
  clearSavedDirectoryHandle,
  pickDirectory,
  readDirectory,
  restoreDirectoryHandle,
  saveDirectoryHandle,
} from '@/lib/fs-access';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MenuRoot,
  MenuTrigger,
  MenuPortal,
  MenuPositioner,
  MenuContent,
  MenuItem,
} from '@/components/ui/menu';

// ─── Constants ───────────────────────────────────────────────────────────────

const ICON_SIZE = 16;
const ICON_STROKE = 2;

const MD_EXTENSIONS = new Set(['.md', '.mdx']);
const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.css', '.html',
  '.py', '.rs', '.go', '.json', '.yaml', '.yml',
  '.toml', '.sql', '.sh', '.bash', '.vue', '.svelte',
]);

function fileIcon(ext: string) {
  if (MD_EXTENSIONS.has(ext)) return <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 text-muted-foreground" />;
  if (CODE_EXTENSIONS.has(ext)) return <FileCode2 size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 text-muted-foreground" />;
  return <File size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 text-muted-foreground" />;
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  onSelectFile: (node: FsNode) => void;
  onMoveNode?: (source: FsNode, targetDir: FsNode) => void;
  onRenameNode?: (node: FsNode, newName: string) => void;
  onDeleteNode?: (node: FsNode) => void;
  onCreateFile?: (parentHandle: FileSystemDirectoryHandle, name: string) => void;
  onCreateFolder?: (parentHandle: FileSystemDirectoryHandle, name: string) => void;
  onRootHandle?: (handle: FileSystemDirectoryHandle) => void;
  refreshKey?: number;
  /** IndexedDB key for persisting this tree's directory handle (allows independent persistence per layout). */
  storeKey?: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkspaceFileTree({ onSelectFile, onMoveNode, onRenameNode, onDeleteNode, onCreateFile, onCreateFolder, onRootHandle, refreshKey, storeKey }: Props) {
  const [nodes, setNodes] = useState<FsNode[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const dragNodeRef = useRef<FsNode | null>(null);
  const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  const hasFolder = nodes.length > 0;

  // ── Session restore ──────────────────────────────────────────────────────

  useEffect(() => {
    restoreDirectoryHandle(storeKey).then(async (handle) => {
      if (!handle) return;
      try {
        const perm = await (handle as any).queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const children = await readDirectory(handle);
          setFolderName(handle.name);
          setNodes(children);
          rootHandleRef.current = handle;
          onRootHandle?.(handle);
        } else {
          setFolderName(handle.name);
          setNeedsReauth(true);
        }
      } catch {
        setFolderName(handle.name);
        setNeedsReauth(true);
      }
    });
  }, []);

  // ── Folder actions ───────────────────────────────────────────────────────

  const openFolder = useCallback(async () => {
    setError('');
    try {
      const handle = await pickDirectory();
      const children = await readDirectory(handle);
      setFolderName(handle.name);
      setNodes(children);
      rootHandleRef.current = handle;
      onRootHandle?.(handle);
      setNeedsReauth(false);
      saveDirectoryHandle(handle, storeKey);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to open folder');
    }
  }, [onRootHandle, storeKey]);

  const reconnectFolder = useCallback(async () => {
    setError('');
    try {
      const handle = await restoreDirectoryHandle(storeKey);
      if (!handle) {
        setNeedsReauth(false);
        clearSavedDirectoryHandle(storeKey);
        return;
      }
      const perm = await (handle as any).requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      const children = await readDirectory(handle);
      setFolderName(handle.name);
      setNodes(children);
      rootHandleRef.current = handle;
      onRootHandle?.(handle);
      setNeedsReauth(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reconnect folder');
    }
  }, [onRootHandle, storeKey]);

  const closeFolder = useCallback(() => {
    setNodes([]);
    setFolderName(null);
    setNeedsReauth(false);
    clearSavedDirectoryHandle(storeKey);
  }, [storeKey]);

  // ── Refresh effect ────────────────────────────────────────────────────────

  useEffect(() => {
    if (refreshKey === undefined || refreshKey === 0) return;
    const handle = rootHandleRef.current;
    if (!handle) return;
    readDirectory(handle).then((children) => {
      setNodes(children);
    });
  }, [refreshKey]);

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, node: FsNode) => {
    dragNodeRef.current = node;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetNode: FsNode) => {
    if (targetNode.kind !== 'directory') return;
    if (dragNodeRef.current?.id === targetNode.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    (e.currentTarget as HTMLElement).dataset.dragOver = 'true';
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    delete (e.currentTarget as HTMLElement).dataset.dragOver;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetNode: FsNode) => {
    e.preventDefault();
    delete (e.currentTarget as HTMLElement).dataset.dragOver;
    const source = dragNodeRef.current;
    dragNodeRef.current = null;
    if (!source || targetNode.kind !== 'directory') return;
    if (source.id === targetNode.id) return;
    onMoveNode?.(source, targetNode);
  }, [onMoveNode]);

  const handleDragEnd = useCallback(() => {
    dragNodeRef.current = null;
  }, []);

  // ── Context menu ──────────────────────────────────────────────────────────

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FsNode } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FsNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('click', dismiss);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', dismiss);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [contextMenu]);

  // ── Tree collection ──────────────────────────────────────────────────────

  const rootNode = useMemo<FsNode>(
    () => ({
      id: 'dir:root',
      name: folderName || 'workspace',
      path: '',
      extension: '',
      kind: 'directory',
      handle: null!,
      children: nodes,
    }),
    [nodes, folderName],
  );

  const collection = useMemo(
    () =>
      createTreeCollection<FsNode>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.name,
        rootNode,
      }),
    [rootNode],
  );

  // ── Error state ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 text-center text-sm text-muted-foreground">
        <span>{error}</span>
        <button type="button" className="text-primary underline text-xs" onClick={openFolder}>
          Try Again
        </button>
      </div>
    );
  }

  // ── Reauth state ─────────────────────────────────────────────────────────

  if (needsReauth && !hasFolder) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <FolderOpen size={20} strokeWidth={1.5} />
        <span>Folder access expired</span>
        <span className="text-xs opacity-70">{folderName}</span>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-primary underline"
          onClick={reconnectFolder}
        >
          <RefreshCw size={12} strokeWidth={ICON_STROKE} />
          Reconnect
        </button>
        <button
          type="button"
          className="text-xs text-muted-foreground/60 underline"
          onClick={closeFolder}
        >
          Dismiss
        </button>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────

  if (!hasFolder) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-sm text-muted-foreground">
        <FolderOpenDot size={24} strokeWidth={1.5} />
        <span>No folder open</span>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          onClick={openFolder}
        >
          Open Folder
        </button>
      </div>
    );
  }

  // ── Tree ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <FolderOpen size={14} strokeWidth={ICON_STROKE} />
          <span className="truncate">{folderName}</span>
        </div>
        <div className="flex items-center gap-1">
          <MenuRoot positioning={{ placement: 'bottom-end', offset: { mainAxis: 4 } }}>
            <MenuTrigger asChild>
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                title="New..."
              >
                <Plus size={13} strokeWidth={ICON_STROKE} />
              </button>
            </MenuTrigger>
            <MenuPortal>
              <MenuPositioner>
                <MenuContent>
                  <MenuItem
                    value="new-file"
                    leftSection={<FilePlus size={14} strokeWidth={ICON_STROKE} />}
                    onClick={() => {
                      const root = rootHandleRef.current;
                      if (!root) return;
                      const name = window.prompt('New file name:');
                      if (name?.trim()) onCreateFile?.(root, name.trim());
                    }}
                  >
                    New File
                  </MenuItem>
                  <MenuItem
                    value="new-folder"
                    leftSection={<FolderPlus size={14} strokeWidth={ICON_STROKE} />}
                    onClick={() => {
                      const root = rootHandleRef.current;
                      if (!root) return;
                      const name = window.prompt('New folder name:');
                      if (name?.trim()) onCreateFolder?.(root, name.trim());
                    }}
                  >
                    New Folder
                  </MenuItem>
                </MenuContent>
              </MenuPositioner>
            </MenuPortal>
          </MenuRoot>
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent"
            onClick={openFolder}
            title="Switch folder"
          >
            <RefreshCw size={13} strokeWidth={ICON_STROKE} />
          </button>
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent"
            onClick={closeFolder}
            title="Close folder"
          >
            <X size={13} strokeWidth={ICON_STROKE} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1 min-h-0" viewportClass="!overflow-x-hidden" contentClass="p-4">
        <TreeViewRoot
          aria-label="Workspace file tree"
          collection={collection}
          selectionMode="single"
          expandOnClick
          canRename={(node) => node.id !== 'dir:root'}
          onRenameComplete={(details) => {
            const node = findNodeById(nodes, details.value);
            if (node && details.label && details.label !== node.name) {
              onRenameNode?.(node, details.label);
            }
          }}
        >
          <TreeViewTree className="py-1 pb-2">
            {collection.rootNode.children?.map((node, index) => (
              <TreeNodeView
                key={node.id}
                node={node}
                indexPath={[index]}
                onSelect={onSelectFile}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onContextMenu={handleContextMenu}
              />
            ))}
          </TreeViewTree>
        </TreeViewRoot>
      </ScrollArea>

      {contextMenu && (
        <div
          className="ui-menu-content fixed z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="ui-menu-item relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              const dir = contextMenu.node.kind === 'directory'
                ? contextMenu.node.handle as FileSystemDirectoryHandle
                : contextMenu.node.parentHandle;
              if (!dir) return;
              const name = window.prompt('New file name:');
              if (name?.trim()) onCreateFile?.(dir, name.trim());
              setContextMenu(null);
            }}
          >
            <FilePlus size={14} strokeWidth={ICON_STROKE} className="shrink-0" />
            New File
          </button>
          <button
            type="button"
            className="ui-menu-item relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              const dir = contextMenu.node.kind === 'directory'
                ? contextMenu.node.handle as FileSystemDirectoryHandle
                : contextMenu.node.parentHandle;
              if (!dir) return;
              const name = window.prompt('New folder name:');
              if (name?.trim()) onCreateFolder?.(dir, name.trim());
              setContextMenu(null);
            }}
          >
            <FolderPlus size={14} strokeWidth={ICON_STROKE} className="shrink-0" />
            New Folder
          </button>
          <div className="ui-menu-separator -mx-1 my-1 h-px bg-border" />
          <button
            type="button"
            className="ui-menu-item relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => { onDeleteNode?.(contextMenu.node); setContextMenu(null); }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findNodeById(nodes: FsNode[], id: string): FsNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// ─── TreeNodeView ────────────────────────────────────────────────────────────

type TreeNodeViewProps = TreeViewNodeProviderProps<FsNode> & {
  onSelect: (node: FsNode) => void;
  onDragStart: (e: React.DragEvent, node: FsNode) => void;
  onDragOver: (e: React.DragEvent, node: FsNode) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, node: FsNode) => void;
  onDragEnd: () => void;
  onContextMenu: (e: React.MouseEvent, node: FsNode) => void;
};

function TreeNodeView({
  node,
  indexPath,
  onSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onContextMenu,
}: TreeNodeViewProps) {
  if (node.kind === 'directory') {
    return (
      <TreeViewNodeProvider node={node} indexPath={indexPath}>
        <TreeViewBranch>
          <TreeViewBranchControl className="min-w-0">
            <TreeViewBranchTrigger
              className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded px-2 py-1 text-sm hover:bg-accent data-[drag-over=true]:bg-accent/50 data-[drag-over=true]:ring-1 data-[drag-over=true]:ring-primary/50"
              draggable
              onDragStart={(e) => onDragStart(e, node)}
              onDragOver={(e) => onDragOver(e, node)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, node)}
              onDragEnd={onDragEnd}
              onContextMenu={(e) => onContextMenu(e, node)}
            >
              <TreeViewBranchIndicator className="transition-transform data-[state=open]:rotate-90">
                <ChevronRight size={14} strokeWidth={ICON_STROKE} className="shrink-0" />
              </TreeViewBranchIndicator>
              <TreeViewBranchText className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                <FolderClosed
                  size={ICON_SIZE}
                  strokeWidth={ICON_STROKE}
                  className="shrink-0 text-muted-foreground [[data-state=open]_&]:hidden"
                />
                <FolderOpen
                  size={ICON_SIZE}
                  strokeWidth={ICON_STROKE}
                  className="shrink-0 text-muted-foreground hidden [[data-state=open]_&]:block"
                />
                <span className="min-w-0 truncate">{node.name}</span>
              </TreeViewBranchText>
            </TreeViewBranchTrigger>
          </TreeViewBranchControl>
          <TreeViewBranchContent className="pl-4">
            <TreeViewBranchIndentGuide />
            {(node.children ?? []).map((child, i) => (
              <TreeNodeView
                key={child.id}
                node={child}
                indexPath={[...indexPath, i]}
                onSelect={onSelect}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                onContextMenu={onContextMenu}
              />
            ))}
          </TreeViewBranchContent>
        </TreeViewBranch>
      </TreeViewNodeProvider>
    );
  }

  return (
    <TreeViewNodeProvider node={node} indexPath={indexPath}>
      <TreeViewItem>
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded px-2 py-1 text-sm hover:bg-accent"
          onClick={() => onSelect(node)}
          draggable
          onDragStart={(e) => onDragStart(e, node)}
          onDragEnd={onDragEnd}
          onContextMenu={(e) => onContextMenu(e, node)}
        >
          <TreeViewItemText className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {fileIcon(node.extension)}
            <span className="min-w-0 truncate">{node.name}</span>
          </TreeViewItemText>
        </button>
      </TreeViewItem>
    </TreeViewNodeProvider>
  );
}
