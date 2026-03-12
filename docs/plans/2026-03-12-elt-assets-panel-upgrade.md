# ELT Assets Panel Upgrade — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the ELT AssetsPanel's Supabase-backed file operations up to feature parity with the superuser WorkspaceFileTree's interaction quality — rename, move, delete confirmation, context menu, folder delete, and drag-to-move.

**Architecture:** The superuser workspace uses the File System Access API for local CRUD. The ELT workspace uses Supabase Storage + `documents_v2` table. This plan adds the missing Supabase RPCs (rename, move, batch delete), then upgrades the AssetsPanel UI to match the superuser WorkspaceFileTree's interaction patterns — context menu, inline rename, drag-to-move, and delete confirmation.

**Tech Stack:** Supabase (PostgreSQL RPCs, Storage API), React, Ark UI TreeView, TypeScript

---

## Reference Files

| Purpose | File |
|---------|------|
| **Target component** | `web/src/components/documents/AssetsPanel.tsx` |
| **Reference component** | `web/src/pages/superuser/WorkspaceFileTree.tsx` |
| **Tree data model** | `web/src/lib/filesTree.ts` |
| **Virtual folders** | `web/src/lib/virtualFolders.ts` |
| **ELT hook** | `web/src/pages/useEltWorkbench.tsx` |
| **Document helpers** | `web/src/lib/projectDetailHelpers.ts` |
| **Table constants** | `web/src/lib/tables.ts` |
| **Supabase client** | `web/src/lib/supabase.ts` |
| **Existing delete RPC** | `supabase/migrations/20260210060852_011_delete_rpcs.sql` |
| **Documents table** | `supabase/migrations/20260208022131_003_v2_parallel_documents_blocks.sql` |

## Key Facts

- Write target table: `source_documents` (view: `view_documents`, underlying: `documents_v2`)
- Document identity: `source_uid` (TEXT, PK)
- Path-of-record: `doc_title` column (e.g. `"reports/Q1/summary.pdf"`)
- Storage bucket: `documents` (env: `VITE_DOCUMENTS_BUCKET`)
- Storage path: `{source_locator}` (stored per-document, separate from `doc_title`)
- Existing RPCs: `delete_document(p_source_uid)` — no rename, no move, no batch delete
- Virtual folders: localStorage only, not in DB — created via `writeStoredVirtualFolders()`
- Ark UI TreeView: already used by both AssetsPanel and WorkspaceFileTree

---

## Task 0: Database — Rename and Move RPCs

### Task 0.1: Add `rename_document` RPC

**Files:**
- Create: `supabase/migrations/20260312120000_077_document_rename_move_rpcs.sql`

**Step 1: Write the migration**

```sql
-- RPC: Rename a document (update doc_title, preserving folder path)
CREATE OR REPLACE FUNCTION public.rename_document(
  p_source_uid TEXT,
  p_new_title TEXT
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.documents_v2
    SET doc_title = p_new_title,
        updated_at = NOW()
    WHERE source_uid = p_source_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found: %', p_source_uid;
  END IF;
END;
$$;

-- RPC: Move a document to a new folder path (update doc_title prefix)
CREATE OR REPLACE FUNCTION public.move_document(
  p_source_uid TEXT,
  p_new_title TEXT
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.documents_v2
    SET doc_title = p_new_title,
        updated_at = NOW()
    WHERE source_uid = p_source_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found: %', p_source_uid;
  END IF;
END;
$$;

-- RPC: Batch move documents by folder prefix (for folder rename/move)
-- Updates all documents whose doc_title starts with old_prefix to use new_prefix
CREATE OR REPLACE FUNCTION public.move_documents_by_prefix(
  p_project_id UUID,
  p_old_prefix TEXT,
  p_new_prefix TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.documents_v2
    SET doc_title = p_new_prefix || SUBSTRING(doc_title FROM LENGTH(p_old_prefix) + 1),
        updated_at = NOW()
    WHERE project_id = p_project_id
      AND doc_title LIKE p_old_prefix || '%';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
```

**Step 2: Apply migration locally**

Run: `supabase db push` or apply via Supabase dashboard

**Step 3: Commit**

```bash
git add supabase/migrations/20260312120000_077_document_rename_move_rpcs.sql
git commit -m "feat(db): add rename_document, move_document, and move_documents_by_prefix RPCs"
```

---

## Task 1: Frontend — Document operation helpers

### Task 1.1: Create `documentOperations.ts` helper module

This module wraps Supabase RPCs and Storage operations into clean async functions that the UI layer can call.

**Files:**
- Create: `web/src/lib/documentOperations.ts`
- Reference: `web/src/lib/tables.ts` (for table names)
- Reference: `web/src/lib/supabase.ts` (for client)
- Reference: `web/src/lib/filesTree.ts` (for `normalizePath`, `joinPath`)

**Step 1: Write the module**

```typescript
import { supabase } from '@/lib/supabase';
import { normalizePath, joinPath } from '@/lib/filesTree';

const DOCUMENTS_BUCKET =
  (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';

/**
 * Rename a document (change the filename portion of doc_title).
 * Preserves the folder path prefix.
 */
export async function renameDocument(
  sourceUid: string,
  currentTitle: string,
  newName: string,
): Promise<void> {
  const parts = normalizePath(currentTitle).split('/');
  parts[parts.length - 1] = newName;
  const newTitle = parts.join('/');

  const { error } = await supabase.rpc('rename_document', {
    p_source_uid: sourceUid,
    p_new_title: newTitle,
  });
  if (error) throw new Error(error.message);
}

/**
 * Move a document to a different folder path.
 * Keeps the filename, changes the folder prefix.
 */
export async function moveDocument(
  sourceUid: string,
  currentTitle: string,
  targetFolderPath: string,
): Promise<void> {
  const fileName = normalizePath(currentTitle).split('/').pop() ?? currentTitle;
  const newTitle = joinPath(targetFolderPath, fileName);

  const { error } = await supabase.rpc('move_document', {
    p_source_uid: sourceUid,
    p_new_title: newTitle,
  });
  if (error) throw new Error(error.message);
}

/**
 * Rename a folder — batch-updates all documents whose doc_title
 * starts with the old folder path to use the new folder path.
 */
export async function renameFolder(
  projectId: string,
  oldFolderPath: string,
  newFolderPath: string,
): Promise<number> {
  const oldPrefix = normalizePath(oldFolderPath) + '/';
  const newPrefix = normalizePath(newFolderPath) + '/';

  const { data, error } = await supabase.rpc('move_documents_by_prefix', {
    p_project_id: projectId,
    p_old_prefix: oldPrefix,
    p_new_prefix: newPrefix,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

/**
 * Delete a folder — deletes all documents with matching prefix,
 * plus removes the corresponding virtual folder entry.
 * Returns the list of source_uids that were deleted (for storage cleanup).
 */
export async function deleteFolder(
  projectId: string,
  folderPath: string,
): Promise<string[]> {
  // Fetch all docs in this folder
  const prefix = normalizePath(folderPath) + '/';
  const { data: docs, error: fetchError } = await supabase
    .from('view_documents')
    .select('source_uid, source_locator')
    .eq('project_id', projectId)
    .like('doc_title', `${prefix}%`);

  if (fetchError) throw new Error(fetchError.message);
  if (!docs || docs.length === 0) return [];

  // Delete each document via existing RPC (cascades blocks, runs, overlays)
  const deletedUids: string[] = [];
  for (const doc of docs) {
    const { error } = await supabase.rpc('delete_document', {
      p_source_uid: doc.source_uid,
    });
    if (!error) deletedUids.push(doc.source_uid);
  }

  // Clean up storage objects
  const locators = docs
    .map((d) => (d.source_locator as string)?.replace(/^\/+/, ''))
    .filter(Boolean);
  if (locators.length > 0) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove(locators);
  }

  return deletedUids;
}
```

**Step 2: Commit**

```bash
git add web/src/lib/documentOperations.ts
git commit -m "feat: add documentOperations helper for rename, move, and folder delete"
```

---

## Task 2: Frontend — Context menu component

### Task 2.1: Create a reusable context menu for the assets tree

Ported from the inline context menu pattern in `WorkspaceFileTree.tsx`, adapted for the ELT data model.

**Files:**
- Create: `web/src/components/documents/AssetsContextMenu.tsx`

**Step 1: Write the component**

```typescript
import { useEffect } from 'react';
import {
  IconFilePlus,
  IconFolderPlus,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import type { FilesTreeNode } from '@/lib/filesTree';

export type ContextMenuState = {
  x: number;
  y: number;
  node: FilesTreeNode;
} | null;

type Props = {
  state: ContextMenuState;
  onDismiss: () => void;
  onRename: (node: FilesTreeNode) => void;
  onDelete: (node: FilesTreeNode) => void;
  onCreateFile: (parentFolderPath: string) => void;
  onCreateFolder: (parentFolderPath: string) => void;
};

export function AssetsContextMenu({
  state,
  onDismiss,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
}: Props) {
  useEffect(() => {
    if (!state) return;
    const dismiss = () => onDismiss();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('click', dismiss);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', dismiss);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [state, onDismiss]);

  if (!state) return null;

  const folderPath =
    state.node.kind === 'folder'
      ? state.node.id.replace(/^folder:/, '')
      : '';

  const itemClass =
    'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground';

  return (
    <div
      className="fixed z-50 min-w-[10rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ top: state.y, left: state.x }}
    >
      <button type="button" className={itemClass} onClick={() => { onCreateFile(folderPath); onDismiss(); }}>
        <IconFilePlus size={14} className="shrink-0" />
        New File
      </button>
      <button type="button" className={itemClass} onClick={() => { onCreateFolder(folderPath); onDismiss(); }}>
        <IconFolderPlus size={14} className="shrink-0" />
        New Folder
      </button>
      <div className="-mx-1 my-1 h-px bg-border" />
      <button type="button" className={itemClass} onClick={() => { onRename(state.node); onDismiss(); }}>
        <IconPencil size={14} className="shrink-0" />
        Rename
      </button>
      <div className="-mx-1 my-1 h-px bg-border" />
      <button type="button" className={itemClass} onClick={() => { onDelete(state.node); onDismiss(); }}>
        <IconTrash size={14} className="shrink-0" />
        Delete
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/documents/AssetsContextMenu.tsx
git commit -m "feat: add AssetsContextMenu component for file tree right-click actions"
```

---

## Task 3: Frontend — Upgrade AssetsPanel

This is the largest task. It upgrades the existing `AssetsPanel.tsx` to support:
- Right-click context menu (rename, delete, create file/folder)
- Inline rename via prompt
- Drag-to-move files between folders
- Delete confirmation dialog
- Folder delete (recursive)

### Task 3.1: Add context menu, rename, and delete confirmation

**Files:**
- Modify: `web/src/components/documents/AssetsPanel.tsx`

**Changes to `AssetsPanelProps`:**

Add new callbacks:

```typescript
export type AssetsPanelProps = {
  // ... existing props ...
  onRenameDocument?: (sourceUid: string, currentTitle: string, newName: string) => Promise<void>;
  onMoveDocument?: (sourceUid: string, currentTitle: string, targetFolderPath: string) => Promise<void>;
  onDeleteFolder?: (folderPath: string) => Promise<void>;
  onRenameFolder?: (oldPath: string, newPath: string) => Promise<void>;
};
```

**Changes to the component body:**

1. Import `AssetsContextMenu` and its `ContextMenuState` type
2. Add state: `const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);`
3. Add state: `const [pendingDelete, setPendingDelete] = useState<FilesTreeNode | null>(null);`
4. Add context menu handler on each tree row: `onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, node }); }}`
5. Add rename handler that uses `window.prompt()` (matching superuser pattern):

```typescript
const handleRename = useCallback(async (node: FilesTreeNode) => {
  if (node.kind === 'folder') {
    const oldPath = node.id.replace(/^folder:/, '');
    const newName = window.prompt('Rename folder:', node.label);
    if (!newName?.trim() || newName.trim() === node.label) return;
    const parts = oldPath.split('/');
    parts[parts.length - 1] = newName.trim();
    const newPath = parts.join('/');
    await onRenameFolder?.(oldPath, newPath);
    return;
  }
  if (!node.doc) return;
  const newName = window.prompt('Rename file:', node.label);
  if (!newName?.trim() || newName.trim() === node.label) return;
  await onRenameDocument?.(node.doc.source_uid, node.doc.doc_title, newName.trim());
}, [onRenameDocument, onRenameFolder]);
```

6. Add delete confirmation:

```typescript
const handleDeleteWithConfirmation = useCallback(async (node: FilesTreeNode) => {
  if (node.kind === 'folder') {
    const folderPath = node.id.replace(/^folder:/, '');
    const ok = window.confirm(`Delete folder "${node.label}" and all its contents?`);
    if (!ok) return;
    await onDeleteFolder?.(folderPath);
    return;
  }
  if (!node.doc) return;
  const ok = window.confirm(`Delete "${node.label}"?`);
  if (!ok) return;
  setSelectedSourceUidLocal(node.doc.source_uid);
  onDeleteSelected();
}, [onDeleteFolder, onDeleteSelected]);
```

Note: The existing trash button should also get a confirmation prompt. Wrap the `onDeleteSelected` call:

```typescript
onClick={() => {
  const doc = docs.find((d) => d.source_uid === selectedSourceUidForActions);
  if (!doc) return;
  const ok = window.confirm(`Delete "${doc.doc_title}"?`);
  if (!ok) return;
  void onDeleteSelected();
}}
```

7. Render the `<AssetsContextMenu />` at the bottom of the component, before the closing `</div>`.

### Task 3.2: Add drag-to-move

**Files:**
- Modify: `web/src/components/documents/AssetsPanel.tsx`

Add drag handlers following the same pattern as `WorkspaceFileTree.tsx`:

```typescript
const dragNodeRef = useRef<FilesTreeNode | null>(null);

const handleDragStart = useCallback((e: React.DragEvent, node: FilesTreeNode) => {
  dragNodeRef.current = node;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', node.id);
}, []);

const handleDragOver = useCallback((e: React.DragEvent, targetNode: FilesTreeNode) => {
  if (targetNode.kind !== 'folder') return;
  if (dragNodeRef.current?.id === targetNode.id) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  (e.currentTarget as HTMLElement).dataset.dragOver = 'true';
}, []);

const handleDragLeave = useCallback((e: React.DragEvent) => {
  delete (e.currentTarget as HTMLElement).dataset.dragOver;
}, []);

const handleDrop = useCallback(async (e: React.DragEvent, targetNode: FilesTreeNode) => {
  e.preventDefault();
  delete (e.currentTarget as HTMLElement).dataset.dragOver;
  const source = dragNodeRef.current;
  dragNodeRef.current = null;
  if (!source || targetNode.kind !== 'folder') return;
  if (source.id === targetNode.id) return;

  const targetPath = targetNode.id.replace(/^folder:/, '');

  if (source.kind === 'folder') {
    // Move all docs in source folder to target folder
    const oldPath = source.id.replace(/^folder:/, '');
    const newPath = joinPath(targetPath, source.label);
    await onRenameFolder?.(oldPath, newPath);
    return;
  }

  if (source.doc) {
    await onMoveDocument?.(source.doc.source_uid, source.doc.doc_title, targetPath);
  }
}, [onMoveDocument, onRenameFolder]);

const handleDragEnd = useCallback(() => {
  dragNodeRef.current = null;
}, []);
```

Then add these props to the folder `<TreeView.BranchControl>` and file `<TreeView.Item>` elements:
- `draggable`
- `onDragStart={(e) => handleDragStart(e, node)}`
- `onDragOver={(e) => handleDragOver(e, node)}` (folders only)
- `onDragLeave={handleDragLeave}` (folders only)
- `onDrop={(e) => handleDrop(e, node)}` (folders only)
- `onDragEnd={handleDragEnd}`
- `onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, node }); }}`

Add a CSS indicator for drag-over state on folders:

```
data-[drag-over=true]:bg-accent/50 data-[drag-over=true]:ring-1 data-[drag-over=true]:ring-primary/50
```

**Step 3: Commit**

```bash
git add web/src/components/documents/AssetsPanel.tsx
git commit -m "feat: add context menu, rename, drag-to-move, and delete confirmation to AssetsPanel"
```

---

## Task 4: Frontend — Wire operations into useEltWorkbench

### Task 4.1: Connect the new document operations to the hook

**Files:**
- Modify: `web/src/pages/useEltWorkbench.tsx`

**Step 1: Import and create handlers**

```typescript
import {
  renameDocument,
  moveDocument,
  renameFolder,
  deleteFolder,
} from '@/lib/documentOperations';
```

Add handlers:

```typescript
const handleRenameDocument = useCallback(async (
  sourceUid: string,
  currentTitle: string,
  newName: string,
) => {
  await renameDocument(sourceUid, currentTitle, newName);
  await loadDocs();
}, [loadDocs]);

const handleMoveDocument = useCallback(async (
  sourceUid: string,
  currentTitle: string,
  targetFolderPath: string,
) => {
  await moveDocument(sourceUid, currentTitle, targetFolderPath);
  await loadDocs();
}, [loadDocs]);

const handleRenameFolder = useCallback(async (
  oldPath: string,
  newPath: string,
) => {
  if (!projectId) return;
  await renameFolder(projectId, oldPath, newPath);
  // Also update virtual folders
  setVirtualFolders?.((prev) =>
    prev.map((f) => (f === oldPath || f.startsWith(oldPath + '/'))
      ? newPath + f.slice(oldPath.length)
      : f
    )
  );
  await loadDocs();
}, [projectId, loadDocs]);

const handleDeleteFolder = useCallback(async (folderPath: string) => {
  if (!projectId) return;
  await deleteFolder(projectId, folderPath);
  // Remove virtual folder entry
  setVirtualFolders?.((prev) =>
    prev.filter((f) => f !== folderPath && !f.startsWith(folderPath + '/'))
  );
  await loadDocs();
}, [projectId, loadDocs]);
```

Note: `virtualFolders` state and `setVirtualFolders` are currently inside `AssetsPanel`. For the hook to update them, either:
- (a) Lift virtual folder state into the hook (cleaner), or
- (b) Pass the rename/delete folder handlers into AssetsPanel and let it handle virtual folder updates internally (simpler, less refactoring)

**Recommended: option (b)** — keep the change surface small. The AssetsPanel already manages virtual folders; the new handlers just need to call `loadDocs()` after the RPC succeeds, and AssetsPanel can update its own virtual folder state in its own rename/delete handlers.

**Step 2: Pass new props to AssetsPanel in `renderContent`**

```typescript
if (tabId === 'assets') {
  return (
    <AssetsPanel
      projectId={projectId}
      docs={docs}
      docsLoading={docsLoading}
      docsError={docsError}
      selectedSourceUid={selectedSourceUid}
      onSelectFile={handleSelectFile}
      onDeleteSelected={handleDeleteSelected}
      onUploadFiles={handleFilesSelected}
      onCreateEntry={(relativePath, type) => {
        if (type === 'folder') return;
        void handleCreateFileEntry(relativePath);
      }}
      selectedSourceUidForActions={selectedSourceUidForActions}
      onRenameDocument={handleRenameDocument}
      onMoveDocument={handleMoveDocument}
      onDeleteFolder={handleDeleteFolder}
      onRenameFolder={handleRenameFolder}
    />
  );
}
```

**Step 3: Commit**

```bash
git add web/src/pages/useEltWorkbench.tsx
git commit -m "feat: wire rename, move, and folder delete operations into ELT workbench"
```

---

## Task 5: Verification

### Task 5.1: Type check

Run: `cd web && npx tsc --noEmit --pretty`
Expected: No errors

### Task 5.2: Manual test checklist

- [ ] Right-click a file → context menu appears with New File, New Folder, Rename, Delete
- [ ] Right-click a folder → same menu, New File/Folder creates inside that folder
- [ ] Rename a file → prompt appears, file name updates in tree after confirm
- [ ] Rename a folder → prompt appears, all nested files update their paths
- [ ] Delete a file → confirmation dialog, file removed after confirm
- [ ] Delete a folder → confirmation dialog warns about contents, all files removed
- [ ] Drag a file onto a folder → file moves into that folder
- [ ] Drag a folder onto another folder → folder (and contents) moves
- [ ] Trash button in toolbar → now shows confirmation before deleting
- [ ] Clicking away or pressing Escape dismisses the context menu

### Task 5.3: Commit all remaining changes

```bash
git add -A
git commit -m "feat: complete ELT assets panel upgrade — rename, move, context menu, delete confirmation"
```

---

## Summary of Changes

| Layer | File | Change |
|-------|------|--------|
| Database | `supabase/migrations/..._077_...sql` | Add `rename_document`, `move_document`, `move_documents_by_prefix` RPCs |
| Lib | `web/src/lib/documentOperations.ts` | New module wrapping RPCs for rename, move, folder rename, folder delete |
| UI | `web/src/components/documents/AssetsContextMenu.tsx` | New reusable context menu component |
| UI | `web/src/components/documents/AssetsPanel.tsx` | Add context menu, inline rename, drag-to-move, delete confirmation |
| Hook | `web/src/pages/useEltWorkbench.tsx` | Wire new operations, pass as props to AssetsPanel |

## Out of Scope (Future)

- Multi-select / batch operations
- Inline rename (Ark UI `canRename` / `onRenameComplete`) — deferred to a follow-up; `window.prompt` is used here to match the superuser pattern and avoid complex inline editing state
- Drag-and-drop upload from OS into specific folder
- Storage-level file rename/move (only `doc_title` is updated; `source_locator` stays the same — the file bytes don't move in the bucket, only the logical path changes)