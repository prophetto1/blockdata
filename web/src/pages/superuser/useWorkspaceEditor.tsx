import { useCallback, useRef, useState } from 'react';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { IconFolderCode, IconFileCode, IconDeviceFloppy, IconLayoutBoard } from '@tabler/icons-react';
import { type FsNode, readFileContent, writeFileContent, moveNode, deleteNode, renameNode, createFile, createDirectory } from '@/lib/fs-access';
import { WorkspaceFileTree } from './WorkspaceFileTree';
import { MdxEditorSurface, type MdxViewMode } from './MdxEditorSurface';
import { CodeEditorSurface } from './CodeEditorSurface';

// ─── Constants ───────────────────────────────────────────────────────────────

const MD_EXTENSIONS = new Set(['.md', '.mdx']);

export const WORKSPACE_TABS = [
  { id: 'file-tree', label: 'Files', icon: IconFolderCode },
  { id: 'editor', label: 'Editor', icon: IconFileCode },
  { id: 'blank', label: 'Empty', icon: IconLayoutBoard },
];

export const WORKSPACE_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['file-tree'], activeTab: 'file-tree', width: 18 },
  { id: 'pane-2', tabs: ['editor'], activeTab: 'editor', width: 60 },
  { id: 'pane-3', tabs: ['blank'], activeTab: 'blank', width: 22 },
]);

// ─── View mode toggle button ────────────────────────────────────────────────

type ViewModeBtnProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function ViewModeBtn({ label, active, onClick }: ViewModeBtnProps) {
  return (
    <button
      type="button"
      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ─── Open file state ─────────────────────────────────────────────────────────

type OpenFile = {
  node: FsNode;
  content: string;
  /** Content at file open time — used as diff baseline. */
  originalContent: string;
  dirty: boolean;
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWorkspaceEditor(storeKey?: string) {
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [treeVersion, setTreeVersion] = useState(0);
  const [mdxViewMode, setMdxViewMode] = useState<MdxViewMode>('rich-text');

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
      setOpenFile({ node, content, originalContent: content, dirty: false });
      setFileKey((k) => k + 1);
      setMdxViewMode('rich-text');
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
      setOpenFile((prev) => prev ? { ...prev, originalContent: prev.content, dirty: false } : null);
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
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="min-w-0 truncate font-medium">{openFile.node.name}</span>
              {openFile.dirty && (
                <span className="text-xs text-muted-foreground">(unsaved)</span>
              )}
            </div>

            {/* Center: view mode toggle */}
            <div className="flex items-center gap-1">
              {isMd ? (
                <>
                  <ViewModeBtn label="Rich Text" active={mdxViewMode === 'rich-text'} onClick={() => setMdxViewMode('rich-text')} />
                  <ViewModeBtn label="Source" active={mdxViewMode === 'source'} onClick={() => setMdxViewMode('source')} />
                  <ViewModeBtn label="Diff" active={mdxViewMode === 'diff'} onClick={() => setMdxViewMode('diff')} />
                </>
              ) : (
                <>
                  <ViewModeBtn label="Edit" active={mdxViewMode === 'rich-text'} onClick={() => setMdxViewMode('rich-text')} />
                  <ViewModeBtn label="Diff" active={mdxViewMode === 'diff'} onClick={() => setMdxViewMode('diff')} />
                </>
              )}
            </div>

            {/* Save button */}
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
              onClick={() => void handleSave()}
              disabled={!openFile.dirty || saving}
              title={saving ? 'Saving\u2026' : 'Save'}
            >
              <IconDeviceFloppy size={16} />
            </button>
          </div>

          {/* Editor surface */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {isMd ? (
              <MdxEditorSurface
                content={openFile.content}
                diffMarkdown={openFile.originalContent}
                fileKey={`${fileKey}`}
                viewMode={mdxViewMode}
                onChange={handleChange}
                onSave={handleSave}
              />
            ) : (
              <CodeEditorSurface
                content={openFile.content}
                originalContent={openFile.originalContent}
                extension={openFile.node.extension}
                fileKey={`${fileKey}`}
                viewMode={mdxViewMode === 'diff' ? 'diff' : 'edit'}
                onChange={handleChange}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      );
    }

    // 'blank' or any unknown tab — render nothing
    return null;
  }, [openFile, fileKey, handleSelectFile, handleChange, handleSave, saving, mdxViewMode, handleMoveNode, handleRenameNode, handleDeleteNode, handleCreateFile, handleCreateFolder, handleRootHandle, treeVersion]);

  return { renderContent };
}
