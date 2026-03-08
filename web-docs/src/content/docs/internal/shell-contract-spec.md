---
title: shell-contract-spec
description: Defines the four shell regions, two shell modes, and implementation contracts for the docs site's Sections and File Tree views.
---

## Overview

The docs site UI is built around a persistent outer shell with a replaceable inner work area. This document locks the shell contracts, defines the two operating modes, and records what has been implemented.

## Shell Regions

Four regions compose the docs shell. The first two are persistent across all modes. The third changes behavior based on mode. The fourth is mode-dependent.

### TopHeaderShell

- **Owner**: `src/components/DocsHeader.astro`
- **Persists**: Always
- **Subregions**: site title (left), search (center), shortcuts + language + theme (right)
- **Contract**: Never duplicated inside preview. Never changes between modes. Desktop layout uses grid math derived from `--sl-content-width`, `--sl-content-inline-start`, and TOC width tokens.

### LeftRailShell

- **Owner**: `src/components/DocsSidebar.astro`
- **Persists**: Always (frame persists; body swaps)
- **Subregions**:
  - **Top strip**: tab bar with Sections and File tree toggle buttons
  - **Body panel**: either curated Starlight navigation (Sections) or Ark UI file tree (File tree)
- **Contract**: The shell frame and top strip remain stable across modes. Only the body panel swaps. The tab strip separator line is the visual contract reused by the work-area top strip.

### ContentWorkAreaShell

- **Owner**: `src/components/DocsTwoColumnContent.astro`
- **Persists**: Always (internals change based on mode)
- **Contract**: This component is the sole owner of the content-area layout. In Sections mode it renders the normal article layout. In File tree mode it renders the two-column editor/preview work shell. Shell layout rules live in this component's `<style>` block, not in external stylesheets.

### RightTocRail

- **Behavior**: Visible only in Sections mode
- **Contract**: Not a core shell region. Treated as disposable content chrome. Hidden in File tree mode.

## Shell Modes

### Sections Mode (default)

The baseline layout, unchanged from the current Starlight article experience.

- Left rail body: curated Starlight navigation
- Content work area: normal article rendering via `<slot />`
- Right rail: TOC visible
- Top header: unchanged

This is the canonical baseline. It must remain exactly as it currently renders.

### File Tree Mode

A separate shell state, not just a sidebar body swap.

- Left rail body: file tree (Ark UI TreeView or File System Access API local folder)
- Right TOC rail: hidden
- Content work area becomes a two-column work shell:
  - **Top strip** spans both columns with a shared separator line
  - **Left column**: editor surface (Source or Keystatic)
  - **Right column**: preview (the same Astro-rendered article content)
  - **Divider**: resizable drag handle between columns

## Shell State Model

### Single source of truth

Shell mode is stored as `data-shell-mode="sections|filetree"` on `<html>`.

- **Module**: `src/lib/docs/shell-state.ts` defines types, constants, read/write functions, and file selection events
- **Attribute**: `data-shell-mode` (replaces the old `data-files-view` and `data-split-editor` attributes)
- **Persistence**: `localStorage` key `shell-mode`
- **Restoration**: The sidebar's inline script reads from localStorage on page load and sets the attribute before hydration

### File selection event

- **Event**: `shell-file-select` (CustomEvent on `window`)
- **Payload**: `{ filePath, docsHref, editorHref, extension }`
- **Dispatched by**: `DocsSidebarFileTree.tsx` when a file node is clicked
- **Consumed by**: `SplitEditorView.tsx` (updates editor content) and `DocsTwoColumnContent.astro` inline script (navigates to `docsHref` for preview)

### Editor mode event

- **Event**: `shell-editor-mode` (CustomEvent on `window`)
- **Payload**: `"source"` or `"keystatic"`
- **Dispatched by**: Top strip tab buttons in `DocsTwoColumnContent.astro`
- **Consumed by**: `SplitEditorView.tsx` (switches between Monaco and Keystatic editor)

## Preview Architecture

### The locked decision

The preview is not a separate app. It is not a second shell. It is the existing Sections content work area rendering.

- **One rendering path**: Astro's normal rendering. No iframe. No HTML injection. No second renderer.
- **One persistent outer shell**: header and left rail stay. They are never duplicated inside preview.
- **Same `<slot />`**: In Sections mode, the slot renders as the main article. In File tree mode, the same slot renders in the preview column via CSS grid placement.

### How file selection works

1. User clicks a file in the tree
2. `shell-file-select` event fires
3. The inline script in DocsTwoColumnContent navigates to `docsHref` via `window.location.href` (normal Astro route change)
4. Shell mode persists via localStorage
5. The new page loads with its article already rendered by Astro
6. The sidebar restores to File tree mode (from localStorage)
7. The article content appears in the preview column because the shell is in filetree mode

No re-rendering. No second fetch. The route changes, the page loads, and the shell mode determines where the article content appears.

## Work Area Top Strip

The top strip spans both columns of the work area and uses the same visual language as the left rail tab strip.

| Left group | Right group |
|---|---|
| Editor tab, Keystatic tab | "Preview" label |

- Same thin separator line as the left rail
- Active tab has an underline indicator (1px solid, same pattern as sidebar tabs)
- Strip grid columns match the editor/preview split ratio via `--split-editor-pct`

## Resizable Divider

- CSS custom property `--split-editor-pct` controls the split ratio
- Drag handle between editor and preview columns
- Pointer events update the property on the `.content-work-area` element
- Ratio is clamped between 20% and 80%
- Persisted in `localStorage` key `shell-split-ratio`
- Restored on page load

## Implementation Status

### Completed

| Change | File | What was done |
|---|---|---|
| Shell-state module | `src/lib/docs/shell-state.ts` | Created unified state model with types, constants, event helpers |
| LeftRailShell contracted | `src/components/DocsSidebar.astro` | Sidebar script rewritten to use `data-shell-mode` instead of `data-files-view` + `data-split-editor` |
| ContentWorkAreaShell | `src/components/DocsTwoColumnContent.astro` | Complete rewrite as mode-aware shell owner with top strip, grid layout, divider, file navigation |
| SplitEditorView refactored | `src/components/SplitEditorView.tsx` | Stripped to pure editor surface: no toolbar, no DOM attribute management, listens to shell events |
| File tree event updated | `src/components/DocsSidebarFileTree.tsx` | Dispatches `shell-file-select` instead of `docs-open-file` |
| CSS cleanup | `src/styles/split-editor.css` | Removed all shell-layout rules, `!important` overrides, mount point styles, old attribute selectors |

### Removed

- `data-files-view` attribute and all references
- `data-split-editor` attribute and all references
- `docs-open-file` custom event
- `#split-editor-mount` wrapper div
- iframe preview model
- Shell-defining layout rules from `split-editor.css`
- `!important` override rules for hiding TOC and expanding main pane

### Not yet verified

- Dev server compilation
- Sections mode renders correctly (unchanged from baseline)
- File tree mode activates the two-column work shell
- File selection updates both editor and preview
- Editor/Keystatic tab switching works
- Resizable divider functions
- Shell mode persists across page navigations

## Key Files

| File | Role |
|---|---|
| `src/lib/docs/shell-state.ts` | Shell state types, constants, event API |
| `src/components/DocsHeader.astro` | TopHeaderShell (unchanged) |
| `src/components/DocsSidebar.astro` | LeftRailShell with mode-aware inline script |
| `src/components/DocsTwoColumnContent.astro` | ContentWorkAreaShell owner, top strip, divider, file navigation |
| `src/components/SplitEditorView.tsx` | Pure editor surface (Monaco + Keystatic) |
| `src/components/DocsSidebarFileTree.tsx` | File tree with `shell-file-select` dispatch |
| `src/lib/docs/content-tree.mjs` | Build-time tree node generation with `docsHref` and `editorHref` |
| `src/pages/api/docs-file.ts` | API endpoint serving raw file content for Monaco editor |
| `src/styles/split-editor.css` | Editor-surface-only styles |

## Design Principles

1. **Shell contracts are owned by components, not stylesheets.** Layout rules for each shell region live in that region's component `<style>` block.
2. **One rendering path.** The preview uses Astro's normal rendering. No second renderer, no iframe, no HTML injection.
3. **One state model.** `data-shell-mode` on `<html>` is the single source of truth. No scattered attribute side effects.
4. **Persistent shell, replaceable content.** Header and left rail never change. Only the content work area changes layout based on mode.
5. **Route-driven preview.** Selecting a file navigates to its docs route. Shell mode persists via localStorage. The article renders in the preview column because the shell is in filetree mode.
