import { useCallback, useRef, useState } from 'react';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { IconFolderCode, IconFileCode } from '@tabler/icons-react';
import { type FsNode, readFileContent, writeFileContent, moveNode, deleteNode, renameNode, createFile, createDirectory } from '@/lib/fs-access';
import { WorkspaceFileTree } from './WorkspaceFileTree';
import { MdxEditorSurface } from './MdxEditorSurface';
import { CodeEditorSurface } from './CodeEditorSurface';

// ─── Constants ───────────────────────────────────────────────────────────────

const MD_EXTENSIONS = new Set(['.md', '.mdx']);

export const WORKSPACE_TABS = [
  { id: 'file-tree', label: 'Files', icon: IconFolderCode },
  { id: 'editor', label: 'Editor', icon: IconFileCode },
];

export const WORKSPACE_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['file-tree'], activeTab: 'file-tree', width: 25 },
  { id: 'pane-2', tabs: ['editor'], activeTab: 'editor', width: 75 },
]);

// ─── Open file state ─────────────────────────────────────────────────────────

type OpenFile = {
  node: FsNode;
  content: string;
  dirty: boolean;
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWorkspaceEditor(storeKey?: string) {
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [treeVersion, setTreeVersion] = useState(0);

  const handleRootHandle = useCallback((handle: FileSystemDirectoryHandle) => {
    rootHandleRef.current = handle;
  }, []);

  const refreshTree = useCallback(() => {
    setTreeVersion((v) => v + 1);
  }, []);

  const handleSelectFile = useCallback(async (node: FsNode) => {
    if (node.kind !== 'file') return;
    try {
      const content = await readFileContent(node.handle as FileSystemFileHandle);
      setOpenFile({ node, content, dirty: false });
      setFileKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  }, []);

  const isOpenFileAffected = useCallback((node: FsNode) => {
    if (!openFile) return false;
    if (openFile.node.id === node.id) return true;
    if (node.kind === 'directory' && openFile.node.path.startsWith(node.path + '/')) return true;
    return false;
  }, [openFile]);

  const handleMoveNode = useCallback(async (source: FsNode, targetDir: FsNode) => {
    if (source.kind === 'directory' && targetDir.path.startsWith(source.path + '/')) {
      console.error('Cannot move a directory into its own descendant');
      return;
    }
    try {
      await moveNode(source, targetDir.handle as FileSystemDirectoryHandle);
      refreshTree();
      if (isOpenFileAffected(source)) setOpenFile(null);
    } catch (err) {
      console.error('Failed to move:', err);
    }
  }, [isOpenFileAffected, refreshTree]);

  const handleRenameNode = useCallback(async (node: FsNode, newName: string) => {
    try {
      await renameNode(node, newName);
      refreshTree();
      if (isOpenFileAffected(node)) setOpenFile(null);
    } catch (err) {
      console.error('Failed to rename:', err);
    }
  }, [isOpenFileAffected, refreshTree]);

  const handleDeleteNode = useCallback(async (node: FsNode) => {
    const label = node.kind === 'directory' ? `folder "${node.name}" and all its contents` : `"${node.name}"`;
    const ok = window.confirm(`Delete ${label}? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteNode(node);
      refreshTree();
      if (isOpenFileAffected(node)) setOpenFile(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }, [isOpenFileAffected, refreshTree]);

  const handleCreateFile = useCallback(async (parentHandle: FileSystemDirectoryHandle, name: string) => {
    try {
      await createFile(parentHandle, name);
      refreshTree();
    } catch (err) {
      console.error('Failed to create file:', err);
      window.alert(err instanceof Error ? err.message : 'Failed to create file');
    }
  }, [refreshTree]);

  const handleCreateFolder = useCallback(async (parentHandle: FileSystemDirectoryHandle, name: string) => {
    try {
      await createDirectory(parentHandle, name);
      refreshTree();
    } catch (err) {
      console.error('Failed to create folder:', err);
      window.alert(err instanceof Error ? err.message : 'Failed to create folder');
    }
  }, [refreshTree]);

  const handleChange = useCallback((value: string) => {
    setOpenFile((prev) => prev ? { ...prev, content: value, dirty: true } : null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!openFile?.dirty) return;
    setSaving(true);
    try {
      await writeFileContent(openFile.node.handle as FileSystemFileHandle, openFile.content);
      setOpenFile((prev) => prev ? { ...prev, dirty: false } : null);
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setSaving(false);
    }
  }, [openFile]);

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'file-tree') {
      return (
        <WorkspaceFileTree
          onSelectFile={handleSelectFile}
          onMoveNode={handleMoveNode}
          onRenameNode={handleRenameNode}
          onDeleteNode={handleDeleteNode}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onRootHandle={handleRootHandle}
          refreshKey={treeVersion}
          storeKey={storeKey}
        />
      );
    }

    if (tabId === 'editor') {
      if (!openFile) {
        return (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground opacity-50">
            Select a file to edit
          </div>
        );
      }

      const isMd = MD_EXTENSIONS.has(openFile.node.extension);

      return (
        <div className="flex h-full flex-col">
          {/* File header bar */}
          <div className="flex items-center justify-between border-b border-border px-4 py-1.5">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="min-w-0 truncate font-medium">{openFile.node.name}</span>
              {openFile.dirty && (
                <span className="text-xs text-muted-foreground">(unsaved)</span>
              )}
            </div>
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              onClick={() => void handleSave()}
              disabled={!openFile.dirty || saving}
            >
              {saving ? 'Saving\u2026' : 'Save'}
            </button>
          </div>

          {/* Editor surface */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {isMd ? (
              <MdxEditorSurface
                content={openFile.content}
                fileKey={`${fileKey}`}
                onChange={handleChange}
                onSave={handleSave}
              />
            ) : (
              <CodeEditorSurface
                content={openFile.content}
                extension={openFile.node.extension}
                fileKey={`${fileKey}`}
                onChange={handleChange}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      );
    }

    return null;
  }, [openFile, fileKey, handleSelectFile, handleChange, handleSave, saving, handleMoveNode, handleRenameNode, handleDeleteNode, handleCreateFile, handleCreateFolder, handleRootHandle, treeVersion]);

  return { renderContent };
}
