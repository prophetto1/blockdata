# SuperuserLayout2 File Operations — Issue Analysis

**Date:** 2026-03-09
**Scope:** Drag-and-drop move, inline rename, right-click delete added to Layout 2
**Files:** `fs-access.ts`, `WorkspaceFileTree.tsx`, `SuperuserLayout2.tsx`
**Method:** Static code trace, no runtime testing

---

## Surface-Level (Visible) Issues

These are problems a user will directly observe during normal interaction.

---

### S1. Drag-and-Drop Conflicts with Workbench Pane DnD

**Severity:** High — breaks both drag systems
**Where:** [WorkspaceFileTree.tsx:158](web/src/pages/superuser/WorkspaceFileTree.tsx#L158) vs [Workbench.tsx:110](web/src/components/workbench/Workbench.tsx#L110)

The file tree sets `e.dataTransfer.setData('text/plain', node.id)` during drag-start. The Workbench's `readDragPayload()` reads `text/plain` as a fallback and tries to parse it as a pane/tab drag payload. When a user drags a file in the tree:

1. The drag event bubbles up to the Workbench `Splitter.Panel`'s `onDragOver` handler ([Workbench.tsx:553](web/src/components/workbench/Workbench.tsx#L553))
2. `readDragPayload` reads `text/plain`, gets `"file:some/path.md"`, fails to parse it as `pane:` or `tab:`, returns `null`
3. The Workbench's `handlePaneDragOver` bails early (no payload, no drag state) — so no Workbench-level interference in the *dragover* phase
4. **But:** `handlePaneDrop` on the panel fires on drop. It also reads `text/plain`, gets `null`, but then falls through to line 464: `moveTabAcrossPanes(paneId, dragStateRef.current)`. Since `dragStateRef.current` is `null`, this is a no-op.

**Visible effect:** The Workbench pane may flash with `is-pane-dragover` styling during file tree drags (line 551), creating a confusing blue highlight around the entire pane while the user is trying to drop a file onto a folder. The file tree drop still works, but the visual feedback is misleading.

**Additionally:** `e.stopPropagation()` is never called on the file tree's drag events, so every drag interaction in the tree also triggers Workbench-level drag handlers on the parent `Splitter.Panel`.

---

### S2. No Visual Feedback for Drop Targets

**Severity:** Medium — user cannot tell where to drop
**Where:** [WorkspaceFileTree.tsx:415](web/src/pages/superuser/WorkspaceFileTree.tsx#L415)

The CSS class `data-[drag-over=true]:bg-accent/50 data-[drag-over=true]:ring-1 data-[drag-over=true]:ring-primary/50` is applied via `dataset.dragOver = 'true'` on the `BranchTrigger`. However:

- The `data-drag-over` attribute is set on the `BranchTrigger` element, but Ark UI may re-render or swap DOM elements during tree state changes, clearing the attribute
- On fast mouse movement between folders, `handleDragLeave` fires on the previous element *after* `handleDragOver` fires on the new element, causing both to briefly show the highlight, then both to lose it
- Directories that are collapsed show the highlight on the trigger only — the user cannot drop onto a collapsed folder and have it auto-expand (no expand-on-hover logic exists)

**Visible effect:** The drop highlight flickers or doesn't appear reliably. Collapsed folders can receive drops but give weak visual indication. No auto-expand on hover.

---

### S3. Cannot Drop Files onto Root Directory

**Severity:** Medium — files stuck in subdirectories
**Where:** [WorkspaceFileTree.tsx:337-350](web/src/pages/superuser/WorkspaceFileTree.tsx#L337)

The tree renders `collection.rootNode.children` directly — the root node itself (`dir:root`) is never rendered as a drop target. There is no way to drag a file from a subdirectory back to the workspace root. The root folder name in the header ([line 296-299](web/src/pages/superuser/WorkspaceFileTree.tsx#L296)) has no drop handlers.

**Visible effect:** User can drag files deeper into the tree but cannot drag them back to the top level.

---

### S4. Context Menu Positioned Off-Screen

**Severity:** Low-Medium — unusable near edges
**Where:** [WorkspaceFileTree.tsx:357-358](web/src/pages/superuser/WorkspaceFileTree.tsx#L357)

The context menu uses `style={{ top: contextMenu.y, left: contextMenu.x }}` with `position: fixed`. No boundary clamping is applied. If the user right-clicks a file near the bottom or right edge of the viewport, the menu renders partially or fully off-screen.

**Visible effect:** "Delete" button may be invisible or unreachable near viewport edges.

---

### S5. Context Menu Has Only "Delete" — No Rename Trigger

**Severity:** Medium — rename feature is hidden
**Where:** [WorkspaceFileTree.tsx:355-368](web/src/pages/superuser/WorkspaceFileTree.tsx#L355)

The context menu only offers "Delete." Ark UI's `canRename` / `onRenameComplete` is wired, but there is no visible trigger for it. Ark UI TreeView's rename is typically activated by selecting a node and pressing F2, or via an explicit `startRename()` API call — neither of which is communicated to the user. The rename feature effectively exists but is invisible.

**Visible effect:** User has no discoverable way to rename files or folders.

---

### S6. Stale Editor State After File Operations

**Severity:** Medium — confusing editor behavior
**Where:** [SuperuserLayout2.tsx:111-122](web/src/pages/superuser/SuperuserLayout2.tsx#L111)

After rename or move, the editor closes (`setOpenFile(null)`) which is correct. But `handleSave` captures `openFile` in its closure at creation time. If the user types in the editor and a tree refresh happens before they click Save:

- `handleSave` uses `openFile.node.handle` which holds the original `FileSystemFileHandle`
- After a rename, this handle still points to the *old* filename (the handle becomes stale after `renameNode` copies to new name and deletes old)
- The editor is closed on rename, so the save-after-rename race is narrow but possible if the rename is triggered externally (e.g., from another tab)

Also: after a refresh (`refreshKey` change), all `FsNode` objects are recreated from `readDirectory()`. The `openFile` still holds a reference to the *old* `FsNode` with the *old* `handle`. The `handle` is still valid for reading and writing (the underlying file hasn't changed), but the `parentHandle` and `path` are stale copies. A subsequent move/rename/delete of the open file would use stale `parentHandle` data.

**Visible effect:** Saving after tree operations might silently fail. The editor appears functional but operates on stale file system state.

---

### S7. Unsaved Changes Lost Without Warning on File Operations

**Severity:** High — data loss
**Where:** [SuperuserLayout2.tsx:69-82](web/src/pages/superuser/SuperuserLayout2.tsx#L69), [84-92](web/src/pages/superuser/SuperuserLayout2.tsx#L84), [94-105](web/src/pages/superuser/SuperuserLayout2.tsx#L94)

All three handlers (`handleMoveNode`, `handleRenameNode`, `handleDeleteNode`) call `setOpenFile(null)` when the open file is affected, discarding any unsaved editor content. No check for `openFile.dirty` is performed before closing the editor.

**Visible effect:** User edits a file, right-clicks it, chooses Delete → confirms → unsaved work is gone. User drags a file to another folder → unsaved work is gone with no warning.

---

### S8. No "Create New File" or "Create New Folder" Actions

**Severity:** Medium — incomplete file management
**Where:** Entire feature

The feature supports browse, open, edit, save, move, rename, and delete — but not creating new files or folders. The `FileSystemDirectoryHandle.getFileHandle(name, { create: true })` and `getDirectoryHandle(name, { create: true })` APIs are already used internally (for move operations) but not exposed.

**Visible effect:** User must leave the app to create new files/folders, then refresh the tree.

---

## Underlying (Structural) Issues

These are code-level problems that cause or amplify the surface issues.

---

### U1. DnD Event Propagation Not Isolated

**Root cause of:** S1 (Workbench DnD conflict)
**Where:** [WorkspaceFileTree.tsx:155-185](web/src/pages/superuser/WorkspaceFileTree.tsx#L155)

None of the file tree drag handlers call `e.stopPropagation()`. Since the tree lives inside a Workbench `Splitter.Panel` that has its own `onDragOver` and `onDrop` handlers, every file tree drag event bubbles up to the Workbench level. The Workbench also uses `text/plain` as a fallback MIME type.

**Fix direction:** Call `e.stopPropagation()` in `handleDragOver`, `handleDrop`, and `handleDragStart`. Consider using a custom MIME type (e.g., `application/x-workspace-tree-drag`) instead of `text/plain` to avoid ambiguity.

---

### U2. `dragOver` / `dragLeave` Race Condition

**Root cause of:** S2 (flicker on drop targets)
**Where:** [WorkspaceFileTree.tsx:161-171](web/src/pages/superuser/WorkspaceFileTree.tsx#L161)

`handleDragOver` and `handleDragLeave` use `e.currentTarget.dataset.dragOver`. When a drag moves from element A to element B:

1. `dragover` fires on B → sets `data-drag-over=true` on B
2. `dragleave` fires on A → clears `data-drag-over` on A

This is correct for simple cases. But when child elements (icon, text span) inside the `BranchTrigger` fire their own `dragenter`/`dragleave` events (which bubble), the `e.currentTarget` resolves to the `BranchTrigger` but `dragleave` fires when entering a child — causing premature clearing.

**Fix direction:** Track the drag-over target in a ref (by node ID) rather than via DOM attributes. Or use a counter-based approach: increment on `dragenter`, decrement on `dragleave`, show highlight when count > 0.

---

### U3. Tree Refresh Replaces All FsNode Identities

**Root cause of:** S6 (stale editor state)
**Where:** [WorkspaceFileTree.tsx:144-151](web/src/pages/superuser/WorkspaceFileTree.tsx#L144)

When `refreshKey` changes, `readDirectory(handle)` re-reads the entire directory tree and calls `setNodes(children)` with entirely new `FsNode` objects. Every `handle`, `parentHandle`, `path`, and `id` is freshly allocated. The `openFile` in `SuperuserLayout2` still holds the old `FsNode` from before the refresh.

This means after *any* file operation (move, rename, delete) that triggers `refreshTree()`:
- The `openFile.node.handle` is a stale copy (still works for read/write of unchanged files, but the handle's identity doesn't match the new tree)
- The `openFile.node.parentHandle` is a stale copy (would be needed for subsequent move/rename/delete of the open file)
- `isOpenFileAffected` compares by `node.id` (string) which still matches, but the handle objects are different instances

**Fix direction:** After tree refresh, if `openFile` is not null, look up the corresponding new node by path or ID and update `openFile.node` with the fresh node (preserving `content` and `dirty` state).

---

### U4. `isOpenFileAffected` Only Checks Source, Not Destination

**Root cause of:** Potential silent overwrite
**Where:** [SuperuserLayout2.tsx:62-67](web/src/pages/superuser/SuperuserLayout2.tsx#L62)

`isOpenFileAffected(source)` checks if the *moved/deleted/renamed* node is the open file. But if a file is *moved into* a directory that contains the open file, and the moved file has the same name as the open file — `moveFile` shows an overwrite confirmation and overwrites the target. The open file's handle now points to a deleted-and-recreated file. The editor is not notified.

**Fix direction:** Also check if the open file is the *target* of a move operation (i.e., will be overwritten).

---

### U5. Rename Uses `onRenameComplete` but Ark UI May Not Fire It

**Root cause of:** S5 (rename is invisible)
**Where:** [WorkspaceFileTree.tsx:328-334](web/src/pages/superuser/WorkspaceFileTree.tsx#L328)

Ark UI TreeView's `canRename` and `onRenameComplete` depend on the TreeView entering "edit mode" for a node. This typically requires:
1. The node to be selected (via `selectionMode="single"`)
2. A trigger (usually F2 key or double-click depending on Ark UI version)

The code wires `canRename` and `onRenameComplete` correctly, but:
- No `onRenameStart` callback is provided (Ark UI may require it to allow the rename)
- The context menu has no "Rename" option that calls the TreeView's `startRename()` method
- There is no keyboard hint or UI affordance telling the user how to trigger rename
- Whether Ark UI TreeView supports F2-to-rename out of the box is version-dependent and not verified

**Fix direction:** Add "Rename" to the context menu. Use the TreeView's imperative API (`api.startRename(nodeId)`) to programmatically trigger rename mode.

---

### U6. `readDirectory` Is Fully Recursive on Every Refresh

**Amplifies:** Perceived latency after every operation
**Where:** [fs-access.ts:33-75](web/src/lib/fs-access.ts#L33) and [WorkspaceFileTree.tsx:148](web/src/pages/superuser/WorkspaceFileTree.tsx#L148)

Every call to `refreshTree()` re-reads the *entire* directory tree from root. For large workspaces, this means:
- Move one file → wait for full recursive re-read of every directory
- Delete one file → wait for full recursive re-read
- Rename one file → wait for full recursive re-read

The File System Access API's `entries()` is async-iterable and involves IPC between the browser and the OS file system. For a workspace with hundreds of files, this can be noticeably slow.

**Fix direction:** Optimistic UI updates (update the tree in-memory immediately, validate with a background re-read). Or partial refresh — only re-read the affected directory.

---

### U7. `moveDirectory` Doesn't Handle Same-Name Child Conflicts

**Potential for:** Silent data loss during recursive copy
**Where:** [fs-access.ts:144-151](web/src/lib/fs-access.ts#L144)

When `moveDirectory` recursively copies children into a new directory (line 144-157), it calls `getFileHandle(childName, { create: true })` directly — **no overwrite check** per-child. The overwrite guard (lines 130-138) only checks if the top-level target *directory* exists (merge guard). Individual files inside a merged directory are silently overwritten.

Example: Move folder `A/` into folder `B/` where `B/A/notes.md` already exists. The user confirms the merge, but `A/notes.md` silently replaces `B/A/notes.md` without a per-file confirmation.

**Fix direction:** Either warn that merge will overwrite existing files, or check each child file before overwriting.

---

### U8. No Error Feedback to User

**Amplifies:** All operation failures
**Where:** [SuperuserLayout2.tsx:79-81](web/src/pages/superuser/SuperuserLayout2.tsx#L79), [89-91](web/src/pages/superuser/SuperuserLayout2.tsx#L89), [102-104](web/src/pages/superuser/SuperuserLayout2.tsx#L102)

All handlers use `console.error('Failed to X:', err)` with no user-visible feedback. If a move fails (e.g., permission denied, disk full, name collision with special characters), the user sees nothing — the tree just doesn't change. Same for rename and delete failures.

**Fix direction:** Surface errors via toast notification, inline error message, or an error state in the tree component.

---

### U9. `CodeEditorSurface` Content Prop Is Read Once, Never Updated

**Related to:** S6 (stale editor state)
**Where:** [CodeEditorSurface.tsx:78](web/src/pages/superuser/CodeEditorSurface.tsx#L78)

`EditorState.create({ doc: content, extensions })` reads `content` only on mount (or when `fileKey`/`extension`/`isDark` changes). The `content` prop is not in the `useEffect` dependency array (intentionally — to avoid cursor-reset on every keystroke). But this means if `SuperuserLayout2` were to update `openFile.content` externally (e.g., after detecting a file change on disk), the editor would not reflect it.

This is not a bug per se (the current architecture doesn't do external content updates), but it means any future "reload file" or "revert changes" feature would need to bump `fileKey` to force a full editor recreation rather than updating content in-place.

---

### U10. `onRootHandle` Missing from `useEffect` Dependencies

**Where:** [WorkspaceFileTree.tsx:92](web/src/pages/superuser/WorkspaceFileTree.tsx#L92)

The session-restore `useEffect` (line 72-92) uses `onRootHandle?.(handle)` but has `[]` as its dependency array. If `onRootHandle` changes identity between renders (it won't currently, since it's wrapped in `useCallback([], [])`), the stale closure would call the old reference. This is technically safe today but fragile — any change to `handleRootHandle`'s dependencies in `SuperuserLayout2` would silently break session restore's root handle propagation.

---

## Issue Map

```
S1 (DnD conflict with Workbench) ←── U1 (no event propagation isolation)
S2 (drop target flicker)         ←── U2 (dragOver/dragLeave race)
S3 (cannot drop to root)         ←── [missing: root not rendered as drop target]
S4 (context menu off-screen)     ←── [missing: boundary clamping]
S5 (rename not discoverable)     ←── U5 (Ark UI rename trigger unclear)
S6 (stale editor state)          ←── U3 (tree refresh replaces all nodes)
                                 ←── U9 (CodeEditor reads content once)
S7 (unsaved changes lost)        ←── [missing: dirty check before close]
S8 (no create file/folder)       ←── [missing: feature not implemented]

U4 (overwrite detection gap)     → potential silent data loss
U6 (full recursive refresh)      → perceived latency
U7 (no per-file merge guard)     → silent data loss in directory moves
U8 (no error feedback)           → all failures are invisible
U10 (stale closure risk)         → fragile but not currently broken
```

---

## Priority Ranking

| Priority | Issue | Reason |
|----------|-------|--------|
| **P0** | S7 — Unsaved changes lost | Data loss with no warning |
| **P0** | U7 — Silent overwrite in directory merge | Data loss with no per-file warning |
| **P1** | S1 + U1 — DnD conflict with Workbench | Breaks core drag interaction |
| **P1** | S5 + U5 — Rename not discoverable | Feature exists but is invisible |
| **P1** | U8 — No error feedback | All failures are silent |
| **P2** | S3 — Cannot drop to root | Limits move functionality |
| **P2** | S2 + U2 — Drop target flicker | Poor UX during drag |
| **P2** | S6 + U3 — Stale editor state | Potential stale-handle bugs |
| **P3** | S4 — Context menu off-screen | Edge case but annoying |
| **P3** | U6 — Full recursive refresh | Performance issue for large trees |
| **P3** | S8 — No create file/folder | Feature gap, not a bug |
| **P4** | U4 — Overwrite detection gap | Narrow edge case |
| **P4** | U9 — CodeEditor content read-once | Not a bug today, future concern |
| **P4** | U10 — Stale closure risk | Not broken today, fragile |