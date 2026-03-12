# ELT Local File Tree Integration Design

**Goal:** Add a "Files" tab to the ELT workbench pane-1 (alongside Assets) that browses a local folder via the File System Access API. Selecting a file shows its content in pane-3 via a new `LocalFilePreview` component.

**Architecture:** Reuse `WorkspaceFileTree` from superuser as-is. Add unified selection state (`ActiveSelection`) so the preview pane (pane-3) routes between `PreviewTabPanel` (Supabase assets) and `LocalFilePreview` (local files) based on which was last clicked.

---

## Layout

```
Pane-1 (18% fixed)          Pane-2 (18% fixed)    Pane-3 (remaining)
[Assets] [Files]             [Parse]                [Preview]
 - Supabase docs tree        - ParseEasyPanel       - PreviewTabPanel (supabase asset)
 - OR local folder tree                             - OR LocalFilePreview (local file)
```

## Selection model

```ts
type ActiveSelection =
  | { kind: 'supabase'; sourceUid: string }
  | { kind: 'local'; node: FsNode }
  | null;
```

- Click file in Assets tab → `{ kind: 'supabase', sourceUid }` → pane-3 renders `PreviewTabPanel`
- Click file in Files tab → `{ kind: 'local', node }` → pane-3 renders `LocalFilePreview`
- Last click wins

## Files to change

### `useEltWorkbench.tsx`
- Register `files` tab: `registerTab({ id: 'files', label: 'Files', group: 'view', render: () => null })`
- Add `files` to `ELT_TABS` array with `IconFolder` icon
- Replace `selectedSourceUid` state with `activeSelection: ActiveSelection`
- Derive `selectedSourceUid` from `activeSelection` when `kind === 'supabase'`
- `renderContent('files')` → `<WorkspaceFileTree storeKey="elt-local-dir" onSelectFile={handleSelectLocalFile} />`
- `renderContent('preview')` → routes based on `activeSelection.kind`
- Update `transformPanes` invariant: both `assets` and `files` are pinned to pane index 0 (can coexist as tabs)

### `LocalFilePreview.tsx` (new)
- Props: `node: FsNode | null`
- Reads file content internally via `readFileContent()` (text) or `URL.createObjectURL()` (images)
- Text files: `<pre>` in scrollable card frame
- Images (.png, .jpg, .gif, .svg, .webp): `<img>` with object URL
- Unsupported: file name + size + message
- Same card frame styling as PreviewTabPanel

### No changes to
- `Workbench.tsx`
- `workbenchState.ts`
- `PreviewTabPanel.tsx`
- `DocumentTest.tsx`
- `WorkspaceFileTree.tsx`
- `fs-access.ts`