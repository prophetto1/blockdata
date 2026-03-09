/**
 * File System Access API utilities for the superuser workspace.
 *
 * Adapted from web-docs/src/lib/docs/local-file-handles.ts — generalized
 * to support all file types and simplified to remove docs-specific concerns.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Directory reading ───────────────────────────────────────────────────────

const IGNORED = new Set([
  '.git', 'node_modules', '.DS_Store', '__pycache__',
  '.next', 'dist', 'build', '.turbo', '.cache',
]);

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

export async function readDirectory(
  dirHandle: FileSystemDirectoryHandle,
  parentPath = '',
): Promise<FsNode[]> {
  const entries: FsNode[] = [];

  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.') && name !== '.env.example') continue;
    if (IGNORED.has(name)) continue;

    const childPath = parentPath ? `${parentPath}/${name}` : name;

    if (handle.kind === 'directory') {
      const children = await readDirectory(handle as FileSystemDirectoryHandle, childPath);
      entries.push({
        id: `dir:${childPath}`,
        name,
        path: childPath,
        extension: '',
        kind: 'directory',
        handle,
        parentHandle: dirHandle,
        children,
      });
    } else {
      entries.push({
        id: `file:${childPath}`,
        name,
        path: childPath,
        extension: getExtension(name),
        kind: 'file',
        handle,
        parentHandle: dirHandle,
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.kind === 'directory' && b.kind !== 'directory') return -1;
    if (a.kind !== 'directory' && b.kind === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

// ─── File read / write ───────────────────────────────────────────────────────

export async function readFileContent(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeFileContent(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await (handle as any).createWritable();
  await writable.write(content);
  await writable.close();
}

// ─── File operations (move / delete / rename) ───────────────────────────────

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
  // 1. Read source content (arrayBuffer to support binary files)
  const file = await (node.handle as FileSystemFileHandle).getFile();
  const content = await file.arrayBuffer();
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

async function moveDirectory(
  node: FsNode,
  targetDirHandle: FileSystemDirectoryHandle,
  newName?: string,
): Promise<void> {
  const name = newName ?? node.name;
  // Check for existing directory (merge guard)
  let existingDir: FileSystemDirectoryHandle | null = null;
  try {
    existingDir = await targetDirHandle.getDirectoryHandle(name);
  } catch {
    // NotFoundError — safe to proceed
  }
  if (existingDir) {
    const ok = window.confirm(`Folder "${name}" already exists in the target. Merge into it?`);
    if (!ok) return;
  }
  // 1. Create directory in target
  const newDirHandle = await targetDirHandle.getDirectoryHandle(name, { create: true });
  // 2. Recursively copy all children
  const srcHandle = node.handle as FileSystemDirectoryHandle;
  for await (const [childName, childHandle] of srcHandle.entries()) {
    if (childHandle.kind === 'file') {
      const file = await (childHandle as FileSystemFileHandle).getFile();
      const content = await file.arrayBuffer();
      const newFile = await newDirHandle.getFileHandle(childName, { create: true });
      const writable = await (newFile as any).createWritable();
      await writable.write(content);
      await writable.close();
    } else {
      await moveDirectory(
        { handle: childHandle, name: childName, kind: 'directory', parentHandle: srcHandle } as FsNode,
        newDirHandle,
      );
    }
  }
  // 3. Remove source directory from parent
  if (node.parentHandle) {
    await node.parentHandle.removeEntry(node.name, { recursive: true });
  }
}

export async function moveNode(
  node: FsNode,
  targetDirHandle: FileSystemDirectoryHandle,
  newName?: string,
): Promise<void> {
  if (!node.parentHandle) {
    throw new Error('Cannot move a node without a parent handle');
  }
  // Guard: cannot move into itself
  // NOTE: moving a parent into a descendant (e.g., /a into /a/b) is guarded
  // by path-prefix check in the UI layer (SuperuserLayout2), not here,
  // because isSameEntry only catches exact matches.
  if (await node.handle.isSameEntry(targetDirHandle)) {
    throw new Error('Cannot move a node into itself');
  }
  if (node.kind === 'file') {
    await moveFile(node, targetDirHandle, newName);
  } else {
    await moveDirectory(node, targetDirHandle, newName);
  }
}

export async function deleteNode(node: FsNode): Promise<void> {
  if (!node.parentHandle) {
    throw new Error('Cannot delete a node without a parent handle');
  }
  const options = node.kind === 'directory' ? { recursive: true } : undefined;
  await node.parentHandle.removeEntry(node.name, options);
}

export async function renameNode(node: FsNode, newName: string): Promise<void> {
  if (!node.parentHandle) {
    throw new Error('Cannot rename a node without a parent handle');
  }
  await moveNode(node, node.parentHandle, newName);
}

// ─── Directory picker ────────────────────────────────────────────────────────

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('File System Access API is not supported in this browser.');
  }
  return (window as any).showDirectoryPicker({ mode: 'readwrite' });
}

// ─── IndexedDB handle persistence ────────────────────────────────────────────

const IDB_NAME = 'superuser-workspace';
const IDB_STORE = 'handles';
const DIR_HANDLE_KEY = 'selectedDir';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function awaitTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, DIR_HANDLE_KEY);
    await awaitTransaction(tx);
    db.close();
  } catch {
    // Ignore — persistence is best-effort.
  }
}

export async function restoreDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(DIR_HANDLE_KEY);
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
      tx.onerror = () => db.close();
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearSavedDirectoryHandle(): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(DIR_HANDLE_KEY);
    await awaitTransaction(tx);
    db.close();
  } catch {
    // Ignore.
  }
}