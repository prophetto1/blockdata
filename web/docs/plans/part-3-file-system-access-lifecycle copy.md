# Part 3: File System Access Lifecycle Layer

## Context

The superuser workspace at `/app/superuser` needs a local-filesystem editor. The browser's File System Access API is the engine. It lets JavaScript read and write files on the user's hard drive with no server round-trip. Everything else, including Ark TreeView, MDXEditor, CodeMirror, and Sandpack, is presentation layer that consumes what this adapter produces.

The existing docs site (`web-docs/`) has a working but tightly-coupled implementation split across `local-file-handles.ts` and `DocsSidebarFileTree.tsx`. Part 3 builds a clean, standalone adapter in the main app (`web/src/lib/fs-access.ts`) that owns the entire lifecycle. Parts 4 (file tree UI) and 5 (editor surfaces) are consumers. They should not touch the raw browser API directly.

---

## How the File System Access API Works

### The Four Core Operations

**1. Open a folder - `showDirectoryPicker()`**

This is the only entry point. It is attached to an `Open Folder` button. The browser opens its native folder picker, and the user selects a directory on their machine.

```js
const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
```

- It must be triggered by a user action, such as a click. It cannot run automatically on page load because the browser requires transient user activation.
- `mode: 'readwrite'` requests read and write permission for the selected handle.
- If the user cancels the picker, it throws a `DOMException` with `name === 'AbortError'`. That is a normal cancel path, not an error state.
- This API is currently Chromium-only. Firefox and Safari do not support it.

**2. Build the tree - `entries()` / `values()`**

Once you have `dirHandle`, loop through it to see what is inside. Folders inside folders must be walked recursively. The raw handles get translated into a plain JSON tree that React components can render.

```js
for await (const [name, handle] of dirHandle.entries()) {
  if (handle.kind === 'file') {
    // Add to files array as { id, name, path, extension, kind: 'file' }
  } else if (handle.kind === 'directory') {
    // Recurse into this folder and build children
  }
}
```

The output is a JSON tree like:

```json
[
  {
    "id": "dir:src",
    "name": "src",
    "path": "src",
    "kind": "directory",
    "children": [
      {
        "id": "file:src/index.ts",
        "name": "index.ts",
        "path": "src/index.ts",
        "extension": ".ts",
        "kind": "file"
      }
    ]
  },
  {
    "id": "file:README.md",
    "name": "README.md",
    "path": "README.md",
    "extension": ".md",
    "kind": "file"
  }
]
```

React components receive this JSON. They never see a `FileSystemHandle`.

**3. Read a file - `getFile()` -> `.text()`**

When the user clicks a file in the tree, the UI sends the `path` string back to this module. The module resolves the path to a handle by walking directory segments, then reads the content.

```js
const fileHandle = await resolveFileHandle(rootDirHandle, 'src/index.ts');
const file = await fileHandle.getFile();
const content = await file.text();
// Pass content string to MDXEditor or CodeMirror
```

**4. Save changes - `createWritable()` -> `write()` -> `close()`**

When the user hits Save, or presses Ctrl/Cmd+S from an editor surface, take the editor content and write it back to the local file.

```js
const fileHandle = await resolveFileHandle(rootDirHandle, 'src/index.ts');
const writable = await fileHandle.createWritable();
await writable.write(newContent);
await writable.close();
```

### The Persistence Catch

A picked `FileSystemDirectoryHandle` can be persisted in IndexedDB because it is structured-cloneable. The handle can survive reloads, but usable access is not guaranteed across sessions. On restore, the browser may return `'granted'`, `'prompt'`, `'denied'`, or fail to restore the handle entirely.

**Why IndexedDB?** Handles cannot be serialized to JSON (`JSON.stringify(handle)` returns `{}`). They are opaque browser objects. IndexedDB is the correct storage for these objects.

**The restore flow:**
1. On page load, retrieve the stored root directory handle from IndexedDB.
2. Call `handle.queryPermission({ mode: 'readwrite' })`.
3. If permission is `'granted'`, rebuild the tree from the handle.
4. If permission is `'prompt'` or `'denied'`, or restore fails, clear the active workspace state and show the default `Open Folder` state.
5. The user can then pick the same folder again or choose a different folder.

This workspace does **not** use a reconnect panel as part of the v1 UX. When a saved handle cannot be reused, the rail falls back to the default empty state.

### Permission States

| State | Meaning | What to do |
|---|---|---|
| `'granted'` | Usable access is available | Proceed normally |
| `'prompt'` | Browser may ask on next `requestPermission()` | Drop back to the default open-folder state |
| `'denied'` | User explicitly denied access | Clear handle, show open-folder button |

---

## UX Contract (for Parts 4-5 / consumers)

The superuser workspace lives inside the existing `AppLayout` shell. A second fixed left panel ("Left Rail 2") between the nav rail and main content area hosts:

1. An **`Open Folder` button** when no directory is active
2. The **selected folder's tree structure** once a directory is picked
3. The **same persisted tree** after reload if the saved handle restores with usable permission

If a saved handle exists but cannot be reused, the rail returns to the default empty state with the `Open Folder` button. It does not show a reconnect-specific panel.

The tree clears only when:
- The user chooses a different folder
- The user logs out
- A saved handle can no longer be reused after restore and the module drops back to the empty state

---

## Implementation Plan

### File: `web/src/lib/fs-access.ts`

Single module. Build it in order.

#### Step 1: Global Type Declarations

The File System Access API types are not in TypeScript's default lib in this repo. Declare them so the module typechecks.

```ts
declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: 'read' | 'readwrite';
      id?: string;
      startIn?: string | FileSystemHandle;
    }) => Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    queryPermission(desc?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission(desc?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
  }

  interface FileSystemFileHandle {
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: string | BufferSource | Blob): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
    close(): Promise<void>;
  }
}
```

#### Step 2: IndexedDB Handle Store

Adapt the proven pattern from `web-docs/src/lib/docs/local-file-handles.ts`. Use a separate database name to avoid collisions with the docs site.

```text
IDB_NAME = 'superuser-workspace'
IDB_STORE = 'handles'
DIR_HANDLE_KEY = 'rootDir'
```

Functions:

| Function | Purpose |
|---|---|
| `saveDirectoryHandle(handle)` | Store the root directory handle in IDB after picker selection |
| `restoreDirectoryHandle()` | Retrieve the stored handle on page load. Return `null` if none exists |
| `clearDirectoryHandle()` | Remove the stored handle on logout, folder change, or unusable restore |

Internal helpers:
- `openIDB()` - promise wrapper around `indexedDB.open()`
- `awaitTransactionComplete(tx)` - promise wrapper around transaction lifecycle

All IDB helpers should fail safely and return `null` or no-op on storage errors.

#### Step 2.5: Exported Workspace Session Contract

Parts 4 and 5 should consume a small workspace-session contract instead of rebuilding lifecycle state themselves.

```ts
export type FsWorkspaceState =
  | { status: 'unsupported' }
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      folderName: string;
      rootHandle: FileSystemDirectoryHandle;
      nodes: FsNode[];
    };

export async function restoreWorkspace(): Promise<FsWorkspaceState>
export async function openWorkspaceFolder(): Promise<FsWorkspaceState>
export async function clearWorkspace(): Promise<void>
```

**Contract rules:**
- `restoreWorkspace()` attempts to restore the saved root handle and returns `ready` only when permission is usable.
- `openWorkspaceFolder()` must be called from a user gesture. It opens the picker, persists the selected handle, builds the tree, and returns `ready`.
- `clearWorkspace()` removes the saved handle and resets the lifecycle state.
- Consumers do not call `queryPermission()`, `requestPermission()`, or IndexedDB helpers directly.

#### Step 3: Permission Lifecycle

```ts
async function checkPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<PermissionState>

async function requestAccess(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean>
```

`checkPermission()` is a silent capability check. `requestAccess()` is an active request helper and should only be called from a user gesture if another part needs it later. In v1, the primary restore fallback is the default `Open Folder` state, not a reconnect panel.

#### Step 4: Feature Detection + Picker

```ts
function isFileSystemAccessSupported(): boolean

async function pickDirectory(): Promise<FileSystemDirectoryHandle | null>
```

`pickDirectory()` wraps `showDirectoryPicker({ mode: 'readwrite' })` and catches `AbortError` to return `null` instead of throwing.

#### Step 5: Directory Tree Builder (Handle -> JSON Translation)

```ts
export type FsNode = {
  id: string;
  name: string;
  path: string;
  extension: string;
  kind: 'file' | 'directory';
  children?: FsNode[];
};

async function readDirectory(
  dirHandle: FileSystemDirectoryHandle,
  parentPath?: string
): Promise<FsNode[]>
```

Recursively walk `dirHandle.entries()`. Skip dotfiles and common noise such as `.git`, `.DS_Store`, `node_modules`, `__pycache__`, `dist`, and `build`. Sort directories first, then alphabetically within each group. Return plain JSON. Do not include raw handles in the output tree.

#### Step 6: File I/O (Read + Write)

```ts
async function readFile(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string
): Promise<string>

async function writeFile(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
  content: string
): Promise<void>
```

Both use an internal `resolveFileHandle()` that walks path segments:

```ts
async function resolveFileHandle(
  root: FileSystemDirectoryHandle,
  relativePath: string
): Promise<FileSystemFileHandle> {
  const segments = relativePath.split('/');
  const fileName = segments.pop()!;
  let dir = root;

  for (const seg of segments) {
    dir = await dir.getDirectoryHandle(seg);
  }

  return dir.getFileHandle(fileName);
}
```

**Design decision:** Store only the root directory handle in IDB. Resolve file handles on demand by path. This avoids IDB bloat, keeps the API simple, and lets consumers operate in terms of paths and workspace state.

---

## The Full Interaction Loop

```text
User loads /app/superuser
  -> restoreWorkspace()
  -> restoreDirectoryHandle() attempts to load the saved root handle from IDB
  -> queryPermission({ mode: 'readwrite' })
  -> if granted: readDirectory() builds FsNode[] and returns ready state
  -> if prompt/denied/failure: return idle state
  -> UI shows either the persisted tree or the default Open Folder button

User clicks "Open Folder"
  -> openWorkspaceFolder() calls showDirectoryPicker()
  -> browser shows the native folder picker
  -> user selects folder
  -> saveDirectoryHandle() persists the new root handle
  -> readDirectory() walks the selected root and returns FsNode[] JSON
  -> UI renders the tree from JSON

User clicks a file in the tree
  -> component sends the relative path string, for example "src/App.tsx"
  -> readFile(rootHandle, "src/App.tsx")
  -> resolveFileHandle() walks root -> subdirectories -> file
  -> getFile() -> text() returns content
  -> content string goes into MDXEditor or CodeMirror

User hits Save
  -> writeFile(rootHandle, "src/App.tsx", editorContent)
  -> resolveFileHandle() walks the same path
  -> createWritable() -> write(content) -> close()
  -> file saves to local disk

User picks a different folder
  -> openWorkspaceFolder() runs again
  -> saveDirectoryHandle() replaces the previous root handle
  -> readDirectory() builds the new tree
  -> UI rerenders around the new workspace

User logs out
  -> clearWorkspace()
  -> clearDirectoryHandle()
  -> UI returns to the default empty state
```

---

## What This Module Does NOT Own

- **Tree UI rendering** - Part 4 consumes `FsNode[]` and renders Ark TreeView
- **Editor surfaces** - Part 5 calls `readFile()` and `writeFile()` through the workspace contract
- **Binary or unsupported file detection** - Part 5 decides what is editable
- **Dirty state tracking** - Part 5 owns editor-state behavior
- **File and folder CRUD** - deferred
- **Remote sync** - deferred; this layer is local-only

---

## Test Plan

### File: `web/src/lib/__tests__/fs-access.test.ts`

Unit tests for pure or synchronous parts:
- `isFileSystemAccessSupported()` returns `false` in Node/test env
- `FsNode` type shape validation
- exported function existence checks

The IndexedDB and handle-based functions are browser-only and should be covered with integration tests later.

### Manual Verification (in Chrome)

1. Run the actual repo verification commands for `web/`:
   - `npm test -- src/lib/__tests__/fs-access.test.ts`
   - any direct TypeScript check command used by the repo, rather than `npm run typecheck`
2. Wire a temporary button to `openWorkspaceFolder()` and confirm picker -> persisted handle -> tree build
3. Reload the page and confirm both valid restore branches:
   - if `queryPermission()` returns `'granted'`, the tree restores immediately
   - if the saved handle is not reusable, the rail returns to the default `Open Folder` state
4. Log out and confirm the saved root handle is removed and the next session starts empty

---

## Files

| Action | Path |
|---|---|
| Create | `web/src/lib/fs-access.ts` |
| Create | `web/src/lib/__tests__/fs-access.test.ts` |
