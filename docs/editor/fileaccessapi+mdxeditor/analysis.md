# SuperuserLayout2 File Editor — Issue Analysis

Systematic debugging analysis of the File System Access API + MDXEditor workspace feature in Layout 2.

**Scope:** `fs-access.ts`, `WorkspaceFileTree.tsx`, `SuperuserLayout2.tsx`, `CodeEditorSurface.tsx`, `MdxEditorSurface.tsx`

---

## Surface-Level Issues (What the User Sees)

### S1. Empty folder shows "No folder open" instead of an empty tree

- **Where:** `WorkspaceFileTree.tsx:68` — `hasFolder = nodes.length > 0`
- **Symptom:** User opens a legitimate folder that contains only dotfiles or ignored entries (all `.git`, `node_modules`, etc.). The tree reads zero nodes. The UI falls through to the "No folder open" empty state with an "Open Folder" button — as if the user never picked anything.
- **Root cause:** `hasFolder` conflates "user selected a folder" with "folder has visible children". The two states need separate tracking.

### S2. No loading indicator when opening a large directory

- **Where:** `WorkspaceFileTree.tsx:96-111` — `openFolder` is async, `readDirectory` is recursive
- **Symptom:** User clicks "Open Folder", picks a large project. Nothing happens for seconds — no spinner, no feedback. Looks frozen.
- **Root cause:** No loading state between `pickDirectory()` and `setNodes(children)`.

### S3. No loading indicator when reading a file into the editor

- **Where:** `SuperuserLayout2.tsx:49-58` — `handleSelectFile` is async
- **Symptom:** User clicks a large file. The editor pane still shows the previous file (or "Select a file") for an indeterminate period. No visual cue that anything is happening.

### S4. Unsaved changes lost without warning when clicking a new file

- **Where:** `SuperuserLayout2.tsx:49-58`
- **Symptom:** User edits a file (dirty flag is true), then clicks a different file in the tree. The editor silently replaces the content. No "You have unsaved changes" prompt.
- **Root cause:** `handleSelectFile` unconditionally overwrites `openFile` state.

### S5. Save fails silently after rename/move/delete of the open file

- **Where:** `SuperuserLayout2.tsx:111-122`
- **Symptom:** User renames a file → editor closes (good). But if the operation handlers fail to close the editor (e.g., race condition), `handleSave` writes to a stale `FileSystemFileHandle` that no longer points to a valid file. The `console.error` fires but the user sees nothing — the Save button just stops working.
- **Root cause:** `openFile.node.handle` becomes stale after the underlying file is moved/renamed/deleted on disk.

### S6. Context menu has no "Rename" entry — rename is not discoverable

- **Where:** `WorkspaceFileTree.tsx:355-368`
- **Symptom:** The only way to rename is via Ark UI's built-in trigger (likely double-click or F2 on focused node). Users right-click expecting "Rename" and only see "Delete". They don't know renaming exists.

### S7. Context menu can overflow the viewport

- **Where:** `WorkspaceFileTree.tsx:357-358` — `style={{ top: contextMenu.y, left: contextMenu.x }}`
- **Symptom:** Right-clicking near the bottom or right edge of the screen positions the menu partially offscreen.

### S8. No visual feedback during drag — drop targets not obvious

- **Where:** `WorkspaceFileTree.tsx:415` — `data-[drag-over=true]` styles on BranchTrigger
- **Symptom:** The `data-[drag-over=true]` CSS attribute is set, but the styling (`bg-accent/50 ring-1 ring-primary/50`) is subtle. More importantly, when dragging over a collapsed folder there's no auto-expand, so users can't drag into nested directories without manually expanding them first.

### S9. Errors from file operations only appear in the console

- **Where:** `SuperuserLayout2.tsx:79-81, 89-91, 102-104`
- **Symptom:** If `moveNode`, `renameNode`, or `deleteNode` throws (e.g., permission denied, file locked), the user sees nothing. The tree doesn't refresh, the operation silently fails.

---

## Underlying Issues (What the Code Hides)

### U1. `renderContent` recreates on every state change — causes editor remounting

- **Where:** `SuperuserLayout2.tsx:124-193`
- **Root cause:** `renderContent` is a `useCallback` with dependencies `[openFile, fileKey, handleSelectFile, handleChange, handleSave, saving, handleMoveNode, handleRenameNode, handleDeleteNode, handleRootHandle, treeVersion]`. Every keystroke in the editor triggers `handleChange` → updates `openFile` → invalidates `renderContent` → Workbench receives a new function reference → potentially re-renders all panes.
- **Impact:** Performance degradation on every keypress. The CodeMirror/MDXEditor surfaces are keyed by `fileKey` so they don't fully remount, but the entire pane layout re-evaluates unnecessarily.

### U2. `handleSave` captures stale `openFile` via closure

- **Where:** `SuperuserLayout2.tsx:111-122` — `useCallback(async () => { ... }, [openFile])`
- **Root cause:** `handleSave` depends on `[openFile]`, which means it captures the `openFile` value at the time the callback was created. But `openFile.content` changes on every keystroke (via `handleChange`). If the user types rapidly and hits Ctrl+S, the save may write a slightly stale version of `content` — specifically the content from when `handleSave` was last recreated, not the absolute latest keystroke.
- **Fix pattern:** Use a ref for `openFile` or read from the functional updater.

### U3. `window.confirm()` inside `moveFile`/`moveDirectory` blocks the main thread

- **Where:** `fs-access.ts:103, 134`
- **Root cause:** `window.confirm()` is synchronous and blocks the browser. In a utility module, this is an architectural inversion — the UI layer should decide how to prompt the user, not the data layer. If you later want async confirmation (e.g., a modal), you'd have to refactor the utility functions.

### U4. `renameNode` triggers the overwrite guard against itself

- **Where:** `fs-access.ts:195-200` → calls `moveNode(node, node.parentHandle, newName)` → calls `moveFile` → checks `targetDirHandle.getFileHandle(name)`
- **Root cause:** When renaming `foo.md` to `bar.md`, `moveFile` checks if `bar.md` exists in the **same** directory. If `bar.md` already exists, the user gets a `window.confirm("bar.md already exists...")`. This is correct behavior for a move, but for rename it's confusing — the dialog says "in the target folder" when you're renaming in place.
- **Worse case:** Renaming `foo.md` to `foo.md` (no change). The `moveNode` guard (`isSameEntry`) doesn't catch this because it compares the file handle against the **parent directory** handle, not itself. So it proceeds to: check if `foo.md` exists → yes → confirm overwrite → read content → write to same file → delete original. It works but it's a no-op that burns through a confirm dialog and unnecessary I/O.

### U5. `moveDirectory` recursive copy doesn't respect the IGNORED filter

- **Where:** `fs-access.ts:141-157`
- **Root cause:** `readDirectory()` filters out `.git`, `node_modules`, etc. But `moveDirectory()` uses raw `srcHandle.entries()` — it copies **everything** including `.git`, `node_modules`, dotfiles, etc. So moving a folder via drag-and-drop copies items that the tree never showed.

### U6. Dual `rootHandle` storage — WorkspaceFileTree and SuperuserLayout2 both hold refs

- **Where:** `WorkspaceFileTree.tsx:66` and `SuperuserLayout2.tsx:38`
- **Root cause:** Both components keep a `rootHandleRef`. The `onRootHandle` callback synchronizes them, but `SuperuserLayout2`'s `rootHandleRef` is never actually used — no code reads from it. It's dead state.

### U7. `onRootHandle` missing from `useEffect` deps in session restore

- **Where:** `WorkspaceFileTree.tsx:92` — `useEffect(() => { ... }, [])`
- **Root cause:** The effect calls `onRootHandle?.(handle)` but has `[]` as deps. If `onRootHandle` changes between renders, the stale version is called. In practice this doesn't break because `handleRootHandle` in SuperuserLayout2 is a stable `useCallback([], [])`, but it's a latent bug if the prop ever becomes dynamic. React's exhaustive-deps lint rule would flag this.

### U8. `CodeEditorSurface` doesn't include `content` in its effect deps — initial content can be stale

- **Where:** `CodeEditorSurface.tsx:87` — `[extension, fileKey, isDark]`
- **Root cause:** The `content` prop is only used during `EditorState.create({ doc: content })` inside the effect. If `content` changes **without** `fileKey` changing, the editor shows stale content. Currently this doesn't happen because `fileKey` is bumped on every file open. But if a parent component ever updates `content` without changing `fileKey` (e.g., external file change detection), the editor would show the wrong content.

### U9. `isOpenFileAffected` closure captures stale `openFile`

- **Where:** `SuperuserLayout2.tsx:62-67` — `useCallback((node) => { ... }, [openFile])`
- **Root cause:** `isOpenFileAffected` depends on `openFile`, so it's recreated on every edit (since `handleChange` updates `openFile`). This forces recreation of `handleMoveNode`, `handleRenameNode`, and `handleDeleteNode` (which depend on `isOpenFileAffected`) on every keystroke — contributing to U1's re-render cascade.

---

## Priority Matrix

### Data loss risks (fix first)

| Issue | Summary |
|-------|---------|
| S4 | Unsaved changes lost without warning |
| U2 | Stale content on save |
| U4 | Rename self-overwrite + confusing confirm dialog |

### Silent failures (fix second)

| Issue | Summary |
|-------|---------|
| S5 | Save to stale handle |
| S9 | Error swallowing in operations |
| U5 | moveDirectory copies ignored files |

### UX gaps (fix third)

| Issue | Summary |
|-------|---------|
| S1 | Empty folder misidentified as "no folder" |
| S2/S3 | No loading indicators |
| S6 | Rename not discoverable |
| S7 | Context menu overflow |
| S8 | Drag feedback insufficient |

### Architectural debt (fix when convenient)

| Issue | Summary |
|-------|---------|
| U1/U9 | renderContent re-render cascade |
| U3 | window.confirm in utility module |
| U6 | Dead rootHandle ref in SuperuserLayout2 |
| U7 | Missing dep in useEffect |
| U8 | Latent stale content in CodeEditorSurface |
