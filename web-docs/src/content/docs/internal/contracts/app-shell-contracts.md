---
title: App Shell Contracts
description: Owner map and behavior contract for the docs app shell, including modes, events, storage, and file-editing boundaries.
---

## Shell Entry Points

The docs shell is mounted through Starlight component overrides in `astro.config.mjs`.

| Shell concern | Contract owner | Notes |
|---|---|---|
| Header shell | `src/components/DocsHeader.astro` | Owns search, site title slot, workspace shortcuts, language, and theme controls |
| Brand/title | `src/components/SiteTitle.astro` | Owns the BlockData wordmark contract used inside the header |
| Left rail shell | `src/components/DocsSidebar.astro` | Owns the sections/file-tree toggle, sidebar panel swap, and sidebar styling |
| Content work-area shell | `src/components/DocsTwoColumnContent.astro` | Owns sections-mode layout, file-tree workbench layout, preview column, and divider |

## Supporting Shell Components

| Component or module | Contract |
|---|---|
| `src/components/DocsSidebarFileTree.tsx` | Tree interaction contract for repo files and local folder files |
| `src/components/EditorTabStrip.tsx` | Editor mode toggle contract: `source` or `rich` |
| `src/components/SplitEditorView.tsx` | Active editor surface, file loading, save flow, and preview refresh dispatch |
| `src/lib/docs/shell-state.ts` | Shared shell state types, DOM attribute contract, storage keys, and custom-event helpers |
| `src/lib/docs/content-tree.mjs` | Docs tree generation, docs-route mapping, and editor-route mapping |
| `src/lib/docs/local-file-handles.ts` | IndexedDB contract for local directory and file handles |
| `src/pages/api/docs-file.ts` | Repo file read/write boundary for `.md` and `.mdx` files under `src/content/docs` |
| `src/styles/split-editor.css` | Editor-surface-only styling; does not own shell layout |

## Region Contract

The implemented shell is organized into four persistent top-level regions and several file-tree subregions.

| Region | Owner | Persistence | Contract |
|---|---|---|---|
| Top header shell | `DocsHeader.astro` | Always present | Stable header chrome; never duplicated inside preview |
| Left rail shell | `DocsSidebar.astro` | Always present | Stable frame; only the body panel swaps between sections and file tree |
| Content work-area shell | `DocsTwoColumnContent.astro` | Always present | Sole owner of content-area layout in both shell modes |
| Right TOC rail | Starlight + `DocsTwoColumnContent.astro` | Sections mode only | Disposable content chrome; hidden in file-tree mode |

File-tree mode adds contracted subregions inside the work area:

- `WorkAreaStripShell`: top strip spanning both columns
- `EditorTabShell`: `Source` and `Rich` toggle area
- `PreviewHeaderShell`: right-side strip label
- `EditorColumnShell`: left editing surface
- `Divider`: only resize authority for the split ratio
- `PreviewColumnShell`: Astro-rendered preview surface

## Shell Modes

| Mode | Attribute value | Left rail body | Work area | TOC rail |
|---|---|---|---|---|
| Sections | `data-shell-mode="sections"` | Starlight navigation | Normal article slot | Visible when TOC exists |
| File tree | `data-shell-mode="filetree"` | Ark UI file tree or local folder tree | Split workbench with editor, divider, and preview | Hidden |

`DocsSidebar.astro` still keeps a local `data-sidebar-view` value for button state, but the cross-component contract is `data-shell-mode` on `<html>`.

## State, Events, And Storage

### DOM attribute contract

- `data-shell-mode="sections|filetree"` on `<html>` is the shell source of truth.
- `data-theme="dark|light"` on `<html>` controls token overrides.

### Storage contract

| Key | Storage | Purpose |
|---|---|---|
| `shell-mode` | `localStorage` | Persist shell mode across navigations |
| `shell-split-ratio` | `localStorage` | Persist workbench split ratio |
| `shell-selected-file` | `sessionStorage` | Persist current file selection during navigation |

### Event contract

| Event | Producer | Consumer | Payload |
|---|---|---|---|
| `shell-file-select` | `DocsSidebarFileTree.tsx` | `SplitEditorView.tsx`, `DocsTwoColumnContent.astro` | `ShellFileInfo` with `filePath`, `extension`, `sourceKind`, and optional route/handle data |
| `shell-file-reset` | `DocsSidebar.astro`, `DocsSidebarFileTree.tsx`, `SplitEditorView.tsx` | `SplitEditorView.tsx`, `DocsTwoColumnContent.astro` | optional reset reason |
| `shell-editor-mode` | `EditorTabStrip.tsx` | `SplitEditorView.tsx` | `'source'` or `'rich'` |
| `shell-preview-refresh` | `SplitEditorView.tsx` | `DocsTwoColumnContent.astro` | source kind plus content when preview can be updated inline |

## File Source Contract

The file tree supports two file-source kinds:

| Source kind | Definition | Backing contract |
|---|---|---|
| `repo` | Files already under `src/content/docs` | `content-tree.mjs` and `/api/docs-file` |
| `local` | User-selected folder via File System Access API | `local-file-handles.ts`, `showDirectoryPicker`, IndexedDB handle persistence |

Local mode is limited to `.md` and `.mdx` files. Hidden files are ignored.

## File Read And Write Contract

`src/pages/api/docs-file.ts` is the repo-write boundary for the editor.

- Reads and writes are restricted to `src/content/docs`.
- Only `.md` and `.mdx` extensions are allowed.
- Paths are normalized and rejected if they escape the docs root.
- `POST` supports token-based authorization through `DOCS_FILE_WRITE_TOKEN`.
- If the token is configured, same-host origin checking is also applied.

Local files bypass the API and are read or written through stored `FileSystemFileHandle` objects.

## Preview Contract

The preview shell is owned by `DocsTwoColumnContent.astro`.

- Repo-backed preview uses the normal Astro route for the selected docs page.
- Local-folder preview is rendered inline from the editor content with a lightweight markdown renderer.
- `SplitEditorView.tsx` does not own the preview column.
- `split-editor.css` styles editor surfaces only and explicitly does not define shell layout.

## Preview Architecture

### Locked decision

The preview is not a separate app. It is not a second shell. It is the existing sections content work area rendering.

- One rendering path: Astro's normal rendering. No iframe. No HTML injection. No second renderer.
- One persistent outer shell: header and left rail stay. They are never duplicated inside preview.
- Same `<slot />`: in sections mode, the slot renders as the main article. In file-tree mode, the same slot renders in the preview column via CSS grid placement.

### File-selection flow

1. The user clicks a file in the tree.
2. `shell-file-select` fires.
3. `DocsTwoColumnContent.astro` persists the selection and either navigates to `docsHref` or waits for local preview content.
4. Shell mode persists through storage.
5. The next page load restores file-tree mode.
6. The article renders inside the preview column because the shell is already in file-tree mode.

Repo preview is route-driven. Local preview is inline-rendered from editor content.

## Work-Area Strip Contract

The top strip spans both columns of the work area and reuses the left-rail toggle language.

| Left group | Right group |
|---|---|
| Editor tabs | Preview label |

- It uses the same thin separator-line treatment as the left rail.
- The active tab uses a 1px underline indicator.
- The strip grid mirrors the editor/preview split ratio through `--split-editor-pct`.

## Divider Contract

- `--split-editor-pct` controls the split ratio.
- The divider is the only resize authority.
- Pointer events update the property on `.content-work-area`.
- The ratio is clamped between `20%` and `80%`.
- The value persists in `localStorage` under `shell-split-ratio`.

## Layout Ownership Rules

These are the practical ownership boundaries enforced by the code today:

- `DocsTwoColumnContent.astro` owns split layout, strip layout, divider behavior, and preview placement.
- `DocsSidebar.astro` owns sidebar mode switching and tree-panel presentation.
- `SplitEditorView.tsx` owns editor loading, save state, and content mutation.
- `split-editor.css` owns Monaco, MDXEditor, save-indicator, and local-preview surface styling only.

## Implementation Status

### Implemented

| Change | File | What was done |
|---|---|---|
| Unified shell-state module | `src/lib/docs/shell-state.ts` | Centralized shell mode, file selection, reset events, and storage keys |
| Left rail shell wiring | `src/components/DocsSidebar.astro` | Sidebar toggle restores and writes `data-shell-mode` |
| Content work-area shell | `src/components/DocsTwoColumnContent.astro` | Mode-aware layout owner with strip, divider, preview, and local preview handling |
| Editor surface refactor | `src/components/SplitEditorView.tsx` | Editor surface listens to shell events and drives save plus preview refresh |
| File tree event model | `src/components/DocsSidebarFileTree.tsx` | File clicks dispatch `shell-file-select` with repo or local metadata |
| Editor-surface CSS split | `src/styles/split-editor.css` | Styling isolated to editor surfaces rather than shell layout |

### Key files

| File | Role |
|---|---|
| `src/lib/docs/shell-state.ts` | Shell state types, constants, and event API |
| `src/components/DocsHeader.astro` | Top header shell |
| `src/components/DocsSidebar.astro` | Left rail shell |
| `src/components/DocsTwoColumnContent.astro` | Content work-area shell |
| `src/components/SplitEditorView.tsx` | Editor surface |
| `src/components/DocsSidebarFileTree.tsx` | Repo and local file tree |
| `src/lib/docs/content-tree.mjs` | Docs-route and editor-route generation |
| `src/pages/api/docs-file.ts` | Repo file read/write boundary |
| `src/styles/split-editor.css` | Editor-surface-only styles |

## Design Principles

1. Shell contracts are owned by components, not stylesheets.
2. The preview uses one rendering path.
3. `data-shell-mode` is the shell source of truth.
4. Header and left rail persist while the work area changes by mode.
5. Repo preview is route-driven; local preview is content-driven.

## Live Spec Drift

The current code has moved beyond the older shell note in `src/content/docs/internal/shell-contract-spec.md`.

| Topic | Older note | Live contract |
|---|---|---|
| Editor toggle | `Source | Keystatic` | `Source | Rich` via `EditorTabStrip.tsx` |
| Secondary editor surface | Keystatic iframe concept | Inline MDXEditor rich surface in `SplitEditorView.tsx` |
| File-tree sidebar state | Older sidebar-view wording | Unified shell contract centered on `data-shell-mode` |

Treat the code and this page as the current shell contract unless the older spec is updated to match.
