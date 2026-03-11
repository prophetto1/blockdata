Plan: Add Drag-and-Drop File Move, Rename, and Delete to SuperuserLayout2
Context
SuperuserLayout2 (web/src/pages/superuser/SuperuserLayout2.tsx) is a two-pane local file editor using the browser's File System Access API. It can browse, read, and save files — but cannot move, rename, or delete them. The goal is to add:

Drag-and-drop file/folder moves between directories
Inline rename (leveraging Ark UI TreeView's built-in canRename/onRenameComplete)
Delete via context menu
All operations stay client-side using the File System Access API. No backend.

API Verification (from MDN & Chrome docs)
API Method	Status	Purpose
dirHandle.removeEntry(name)	Stable since March 2023	Delete file from parent dir
dirHandle.removeEntry(name, { recursive: true })	Stable since March 2023	Delete non-empty directory
dirHandle.getFileHandle(name, { create: true })	Stable since March 2023	Create new file in target dir
dirHandle.getDirectoryHandle(name, { create: true })	Stable since March 2023	Create new subdirectory in target dir
handle.move()	Unstable for non-OPFS files (behind flag)	NOT USED
Move strategy: copy content to target directory → removeEntry() from source parent. This is the only stable cross-browser approach for files accessed via showDirectoryPicker().

Critical gap: FsNode (line 10-18 in fs-access.ts) has no parentHandle field. removeEntry() must be called on the parent directory handle, passing the child's name. Without parentHandle, we cannot delete or move.

Ark UI TreeView Capabilities (verified via Context7)
Feature	Available	Details
Drag-and-drop	No	Must implement via HTML5 DnD on rendered elements
Inline rename	Yes	canRename, onBeforeRename, onRenameStart, onRenameComplete props on TreeView.Root
Selection	Yes	Already used (selectionMode="single")
Files to Modify
File	Changes
fs-access.ts	Add parentHandle to FsNode, add moveNode/deleteNode/renameNode functions
WorkspaceFileTree.tsx	Add HTML5 drag-and-drop, wire Ark UI rename, add context menu, new callback props
SuperuserLayout2.tsx	Wire move/rename/delete handlers, manage tree refresh and open-file state
Step 1: Extend FsNode type with parentHandle
File: web/src/lib/fs-access.ts, lines 10-18

Current:


export type FsNode = {
  id: string;
  name: string;
  path: string;
  extension: string;
  kind: 'file' | 'directory';
  handle: FileSystemHandle;
  children?: FsNode[];
};
Change to:


export type FsNode = {
  id: string;
  name: string;
  path: string;
  extension: string;
  kind: 'file' | 'directory';
  handle: FileSystemHandle;
  parentHandle?: FileSystemDirectoryHandle;
  children?: FsNode[];
};
parentHandle is optional because the root-level nodes returned by readDirectory() will have the root dirHandle as their parent, while the synthetic root node in WorkspaceFileTree (line 131-142) has no parent.

Then update readDirectory() (lines 32-72) to populate parentHandle:

Current signature: readDirectory(dirHandle, parentPath)

No signature change. The dirHandle parameter already IS the parent handle for all entries yielded by dirHandle.entries(). Add parentHandle: dirHandle to each entries.push() call:

Line 46-54 (directory entries): add parentHandle: dirHandle to the object literal
Line 56-63 (file entries): add parentHandle: dirHandle to the object literal
This is safe because the recursive call readDirectory(handle as FileSystemDirectoryHandle, childPath) already passes the child directory handle, which becomes the dirHandle (and thus parentHandle) for the next level of recursion.

Step 2: Add file operation functions to fs-access.ts
File: web/src/lib/fs-access.ts, add after line 85 (after writeFileContent)

2a: moveFile (private helper)

async function moveFile(
  node: FsNode,
  targetDirHandle: FileSystemDirectoryHandle,
  newName?: string,
): Promise<void> {
  const name = newName ?? node.name;
  // 1. Read source content
  const file = await (node.handle as FileSystemFileHandle).getFile();
  const content = await file.text();
  // 2. Create file in target directory
  const newHandle = await targetDirHandle.getFileHandle(name, { create: true });
  const writable = await (newHandle as any).createWritable();
  await writable.write(content);
  await writable.close();
  // 3. Remove source from parent
  if (node.parentHandle) {
    await node.parentHandle.removeEntry(node.name);
  }
}
Why read as text? All files in this workspace are text-based (md, mdx, code files). If binary file support is needed later, change to file.arrayBuffer() + write ArrayBuffer. For now, text is correct and matches the existing readFileContent/writeFileContent pattern.

Overwrite guard: Before creating the file in the target, check if a file with the same name already exists. If so, return a flag or throw so the caller can show a confirm() dialog. Implementation: wrap getFileHandle(name) (without { create: true }) in a try/catch — if it succeeds, the file exists; if it throws NotFoundError, proceed safely.

Updated moveFile:


async function moveFile(
  node: FsNode,
  targetDirHandle: FileSystemDirectoryHandle,
  newName?: string,
): Promise<void> {
  const name = newName ?? node.name;
  // Check for existing file (overwrite guard)
  let existingFile: FileSystemFileHandle | null = null;
  try {
    existingFile = await targetDirHandle.getFileHandle(name);
  } catch {
    // NotFoundError — safe to proceed
  }
  if (existingFile) {
    const ok = window.confirm(`"${name}" already exists in the target folder. Overwrite?`);
    if (!ok) return;
  }
  // 1. Read source content
  const file = await (node.handle as FileSystemFileHandle).getFile();
  const content = await file.text();
  // 2. Create file in target directory
  const newHandle = await targetDirHandle.getFileHandle(name, { create: true });
  const writable = await (newHandle as any).createWritable();
  await writable.write(content);
  await writable.close();
  // 3. Remove source from parent
  if (node.parentHandle) {
    await node.parentHandle.removeEntry(node.name);
  }
}
2b: moveDirectory (private helper)

async function moveDirectory(
  node: FsNode,
  targetDirHandle: FileSystemDirectoryHandle,
  newName?: string,
): Promise<void> {
  const name = newName ?? node.name;
  // 1. Create directory in target
  const newDirHandle = await targetDirHandle.getDirectoryHandle(name, { create: true });
  // 2. Recursively copy all children
  const srcHandle = node.handle as FileSystemDirectoryHandle;
  for await (const [childName, childHandle] of srcHandle.entries()) {
    if (childHandle.kind === 'file') {
      const file = await (childHandle as FileSystemFileHandle).getFile();
      const content = await file.text();
      const newFile = await newDirHandle.getFileHandle(childName, { create: true });
      const writable = await (newFile as any).createWritable();
      await writable.write(content);
      await writable.close();
    } else {
      // Recursive: create a temporary FsNode for the child directory
      await moveDirectory(
        { handle: childHandle, name: childName, parentHandle: srcHandle } as FsNode,
        newDirHandle,
      );
    }
  }
  // 3. Remove source directory from parent (recursive: true to handle any missed entries)
  if (node.parentHandle) {
    await node.parentHandle.removeEntry(node.name, { recursive: true });
  }
}
2c: moveNode (exported, unified entry point)

export async function moveNode(
  node: FsNode,
  targetDirHandle: FileSystemDirectoryHandle,
  newName?: string,
): Promise<void> {
  if (!node.parentHandle) {
    throw new Error('Cannot move a node without a parent handle');
  }
  if (node.kind === 'file') {
    await moveFile(node, targetDirHandle, newName);
  } else {
    await moveDirectory(node, targetDirHandle, newName);
  }
}
2d: deleteNode (exported)
Caller is responsible for showing confirm() before calling this function. The function itself is unconditional.


export async function deleteNode(node: FsNode): Promise<void> {
  if (!node.parentHandle) {
    throw new Error('Cannot delete a node without a parent handle');
  }
  const options = node.kind === 'directory' ? { recursive: true } : undefined;
  await node.parentHandle.removeEntry(node.name, options);
}
2e: renameNode (exported)
Rename = move within same parent with a new name.


export async function renameNode(node: FsNode, newName: string): Promise<void> {
  if (!node.parentHandle) {
    throw new Error('Cannot rename a node without a parent handle');
  }
  await moveNode(node, node.parentHandle, newName);
}
Validation: prevent move-into-self
moveNode must guard against moving a directory into itself or a descendant. Add this check at the top of moveNode:


// Guard: cannot move a directory into itself or a descendant
if (node.kind === 'directory') {
  const isSelf = await targetDirHandle.resolve(node.handle as FileSystemDirectoryHandle);
  if (isSelf !== null) {
    throw new Error('Cannot move a directory into itself or a descendant');
  }
}
Wait — resolve() is on FileSystemDirectoryHandle and returns the path from the root to the child. A simpler guard: compare handles using isSameEntry():


if (await node.handle.isSameEntry(targetDirHandle)) {
  throw new Error('Cannot move a node into itself');
}
// Also check: target is not a descendant of source (for directories)
if (node.kind === 'directory') {
  const path = await (node.handle as FileSystemDirectoryHandle).resolve(targetDirHandle);
  if (path !== null) {
    throw new Error('Cannot move a directory into its own descendant');
  }
}
Note: resolve() returns string[] | null. If the target is inside the source, it returns a path array. If not, it returns null. However — resolve() is defined on FileSystemDirectoryHandle and resolves a child relative to the directory. So the correct check is: call (node.handle as FileSystemDirectoryHandle).resolve(targetDirHandle) — if non-null, target is inside source.

Correction after review: resolve() is only available on OPFS handles, not local file system handles from showDirectoryPicker(). The safe alternative is a path prefix check: if targetDir's path starts with source's path, reject the move. This requires the tree to be aware of paths, which FsNode.path already provides.

Final guard (path-based): This check will be done in the UI layer (SuperuserLayout2.tsx) where we have access to both nodes' .path properties, before calling moveNode. The guard in moveNode itself will just use isSameEntry() (which IS available on local handles):


if (await node.handle.isSameEntry(targetDirHandle)) {
  throw new Error('Cannot move a node into itself');
}
The descendant check uses path prefix comparison in the caller.

Step 3: Add drag-and-drop and rename to WorkspaceFileTree
File: web/src/pages/superuser/WorkspaceFileTree.tsx

3a: Expand Props type (line 49-51)
Current:


type Props = {
  onSelectFile: (node: FsNode) => void;
};
Change to:


type Props = {
  onSelectFile: (node: FsNode) => void;
  onMoveNode?: (source: FsNode, targetDir: FsNode) => void;
  onRenameNode?: (node: FsNode, newName: string) => void;
  onDeleteNode?: (node: FsNode) => void;
};
3b: Add drag state via useRef
Inside WorkspaceFileTree component, add a ref to hold the currently dragged node. We use a ref (not state) because drag events fire rapidly and we don't need re-renders:


const dragNodeRef = useRef<FsNode | null>(null);
Import useRef from React (add to the existing import on line 18).

3c: Add drag event handlers
Create three handler functions inside the component:


const handleDragStart = useCallback((e: React.DragEvent, node: FsNode) => {
  dragNodeRef.current = node;
  e.dataTransfer.effectAllowed = 'move';
  // Set minimal data for the drag operation (required by spec)
  e.dataTransfer.setData('text/plain', node.id);
}, []);

const handleDragOver = useCallback((e: React.DragEvent, targetNode: FsNode) => {
  // Only allow dropping onto directories
  if (targetNode.kind !== 'directory') return;
  // Don't allow dropping onto self
  if (dragNodeRef.current?.id === targetNode.id) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  // Add visual indicator via data attribute (for CSS)
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
3d: Pass drag handlers to TreeNodeView
Update the TreeNodeView call site (line 252) and the component's props to accept and wire drag handlers.

TreeNodeView props addition:


type TreeNodeViewProps = TreeView.NodeProviderProps<FsNode> & {
  onSelect: (node: FsNode) => void;
  onDragStart: (e: React.DragEvent, node: FsNode) => void;
  onDragOver: (e: React.DragEvent, node: FsNode) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, node: FsNode) => void;
  onDragEnd: () => void;
};
3e: Apply drag attributes to rendered elements in TreeNodeView
For directory branch trigger (currently line 273):

Add to the TreeView.BranchTrigger element:


<TreeView.BranchTrigger
  className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-accent data-[drag-over=true]:bg-accent/50 data-[drag-over=true]:ring-1 data-[drag-over=true]:ring-primary/50"
  draggable
  onDragStart={(e) => onDragStart(e, node)}
  onDragOver={(e) => onDragOver(e, node)}
  onDragLeave={onDragLeave}
  onDrop={(e) => onDrop(e, node)}
  onDragEnd={onDragEnd}
>
For file items (currently line 306-309):

Add to the <button> element:


<button
  type="button"
  className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-accent"
  onClick={() => onSelect(node)}
  draggable
  onDragStart={(e) => onDragStart(e, node)}
  onDragEnd={onDragEnd}
>
Files are draggable (drag sources) but NOT drop targets. Only directories are drop targets.

3f: Wire Ark UI inline rename
On TreeView.Root (line 244), add rename props:


<TreeView.Root
  aria-label="Workspace file tree"
  collection={collection}
  selectionMode="single"
  expandOnClick
  canRename={(details) => {
    // Allow renaming any node except the synthetic root
    return details.value !== 'dir:root';
  }}
  onRenameComplete={(details) => {
    // details has { value: string, name: string } — value is node ID, name is the new name
    const node = findNodeById(nodes, details.value);
    if (node && details.name && details.name !== node.name) {
      onRenameNode?.(node, details.name);
    }
  }}
>
Add findNodeById helper (private function in WorkspaceFileTree.tsx):


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
3g: Add context menu for delete
Add a minimal right-click context menu on tree items. Use a simple state-based approach (no external menu library):

State in WorkspaceFileTree:


const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FsNode } | null>(null);
Handler:


const handleContextMenu = useCallback((e: React.MouseEvent, node: FsNode) => {
  e.preventDefault();
  setContextMenu({ x: e.clientX, y: e.clientY, node });
}, []);
Dismiss on click outside:


useEffect(() => {
  if (!contextMenu) return;
  const dismiss = () => setContextMenu(null);
  window.addEventListener('click', dismiss);
  return () => window.removeEventListener('click', dismiss);
}, [contextMenu]);
Render the menu (inside the tree's outer <div>, after </ScrollArea>):


{contextMenu && (
  <div
    className="fixed z-50 min-w-[140px] rounded-md border border-border bg-popover p-1 shadow-md"
    style={{ top: contextMenu.y, left: contextMenu.x }}
  >
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
      onClick={() => { onDeleteNode?.(contextMenu.node); setContextMenu(null); }}
    >
      Delete
    </button>
  </div>
)}
Wire onContextMenu on both branch triggers and file buttons:


onContextMenu={(e) => handleContextMenu(e, node)}
Step 4: Wire handlers in SuperuserLayout2
File: web/src/pages/superuser/SuperuserLayout2.tsx

4a: Add imports
Add moveNode, deleteNode, renameNode, readDirectory to the import from @/lib/fs-access (line 5):


import { type FsNode, readFileContent, writeFileContent, moveNode, deleteNode, renameNode, readDirectory } from '@/lib/fs-access';
4b: Store root directory handle
Currently the root handle is only held inside WorkspaceFileTree. To refresh the tree after operations, SuperuserLayout2 needs access to it. Two approaches:

Approach chosen: Add a rootHandle ref and an onTreeLoaded callback prop to WorkspaceFileTree.

In WorkspaceFileTree, after a folder is opened (line 91-95) or reconnected (line 113-116), call a new onRootHandle prop:

Add to Props:


onRootHandle?: (handle: FileSystemDirectoryHandle) => void;
Call it after setNodes(children) in openFolder and reconnectFolder:


onRootHandle?.(handle);
In SuperuserLayout2, store it:


const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
const [treeVersion, setTreeVersion] = useState(0);

const handleRootHandle = useCallback((handle: FileSystemDirectoryHandle) => {
  rootHandleRef.current = handle;
}, []);
4c: Tree refresh helper

const refreshTree = useCallback(() => {
  setTreeVersion((v) => v + 1);
}, []);
WorkspaceFileTree will accept a refreshKey prop and re-read the directory when it changes:


// In WorkspaceFileTree, add to Props:
refreshKey?: number;

// Add useEffect:
useEffect(() => {
  if (!rootHandleRef.current) return; // use internal state, not the ref
  // Re-read the directory and update nodes
}, [refreshKey]);
Simpler alternative chosen: Instead of refreshKey, expose a refresh mechanism. Actually the simplest approach: WorkspaceFileTree already stores nodes and the handle internally. Add a refreshKey prop — when it changes, re-read the stored handle.

In WorkspaceFileTree, add effect (after the existing useEffect on line 65):


// Track the handle in a ref for refresh
const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

// Update ref when folder opens (inside openFolder and reconnectFolder)
rootHandleRef.current = handle;
Add a new prop refreshKey?: number and effect:


useEffect(() => {
  if (refreshKey === undefined || refreshKey === 0) return;
  const handle = rootHandleRef.current;
  if (!handle) return;
  readDirectory(handle).then((children) => {
    setNodes(children);
  });
}, [refreshKey]);
4d: Move handler

const handleMoveNode = useCallback(async (source: FsNode, targetDir: FsNode) => {
  // Guard: prevent moving into self or descendant
  if (source.kind === 'directory' && targetDir.path.startsWith(source.path + '/')) {
    console.error('Cannot move a directory into its own descendant');
    return;
  }
  try {
    await moveNode(source, targetDir.handle as FileSystemDirectoryHandle);
    refreshTree();
    // If the moved file was open, close the editor (file handle is now stale)
    if (openFile && openFile.node.id === source.id) {
      setOpenFile(null);
    }
  } catch (err) {
    console.error('Failed to move:', err);
  }
}, [openFile, refreshTree]);
4e: Rename handler

const handleRenameNode = useCallback(async (node: FsNode, newName: string) => {
  try {
    await renameNode(node, newName);
    refreshTree();
    // If the renamed file was open, close the editor (handle is now stale)
    if (openFile && openFile.node.id === node.id) {
      setOpenFile(null);
    }
  } catch (err) {
    console.error('Failed to rename:', err);
  }
}, [openFile, refreshTree]);
4f: Delete handler (with confirmation)

const handleDeleteNode = useCallback(async (node: FsNode) => {
  const label = node.kind === 'directory' ? `folder "${node.name}" and all its contents` : `"${node.name}"`;
  const ok = window.confirm(`Delete ${label}? This cannot be undone.`);
  if (!ok) return;
  try {
    await deleteNode(node);
    refreshTree();
    // If the deleted file was open, close the editor
    if (openFile && openFile.node.id === node.id) {
      setOpenFile(null);
    }
  } catch (err) {
    console.error('Failed to delete:', err);
  }
}, [openFile, refreshTree]);
4g: Pass new props to WorkspaceFileTree
Update the renderContent function's file-tree branch (line 69):


return (
  <WorkspaceFileTree
    onSelectFile={handleSelectFile}
    onMoveNode={handleMoveNode}
    onRenameNode={handleRenameNode}
    onDeleteNode={handleDeleteNode}
    onRootHandle={handleRootHandle}
    refreshKey={treeVersion}
  />
);
Verification Plan
Build check: Run npm run build in web/ to verify TypeScript compilation
Manual test in Chrome (File System Access API is Chromium-only):
Open SuperuserLayout2 at /app/superuser/layout-2
Pick a test folder with nested directories and files
Drag file → folder: Verify file appears in target, disappears from source, exists on disk in new location
Drag folder → folder: Verify recursive copy + delete, all children preserved
Drag onto self: Verify no-op (no error, no action)
Drag folder into its own child: Verify blocked (path prefix guard)
Rename: Double-click (or however Ark UI triggers rename) on a file → type new name → confirm → verify on disk
Delete: Right-click → Delete → verify removed from tree and disk
Open file then move it: Verify editor closes (stale handle)
Open file then delete it: Verify editor closes
Confirmation dialogs:
Drag file to folder with same-name file → confirm() overwrite prompt appears → Cancel stops move, OK overwrites
Right-click → Delete → confirm() prompt with file/folder name → Cancel stops delete, OK deletes from disk
Edge cases:
Move to root level of the workspace (drop on the root header area)
Notes
No backend required — pure File System Access API
FileSystemHandle.move() intentionally NOT used (unstable for non-OPFS files per Chrome docs)
Copy+delete is the only stable approach for local file handles
Ark UI TreeView has no built-in DnD — HTML5 Drag and Drop API is used directly on the rendered elements
Ark UI TreeView DOES have built-in rename (canRename/onRenameComplete) — we leverage this
removeEntry() is stable since March 2023 per MDN, supports { recursive: true } for directories
Text-only file operations for now (matches existing readFileContent/writeFileContent pattern)