# Filetree Mode — Developer Briefing

## What You're Looking At

This document accompanies **`FILETREE-MODE-SOURCE.md`**, which contains the complete source code for 14 files that together implement a "filetree editor mode" in an Astro/Starlight documentation site. Each code block in that file is labeled with its file path. **These are real source files — you will edit them and insert them back into the project at those paths.**

The project lives at `web-docs/` and runs on:
- **Astro 5.18** (MPA framework — every navigation is a full server render)
- **Starlight 0.37** (Astro's docs theme)
- **React islands** via `client:load` (React components hydrate independently after Astro delivers the page)
- **Ark UI** (React component library — TreeView, Splitter, ScrollArea)

Dev server: `npm run dev` from `web-docs/`, runs on port 4421.

---

## The Two Modes

The site has two display modes, toggled by a `data-shell-mode` attribute on `<html>`:

### `sections` (default)
Standard Starlight docs layout. Left sidebar has section navigation. Main content area shows the rendered doc page. This mode works fine.

### `filetree`
IDE-like split-pane layout. The sidebar shows a file tree of `src/content/docs/`. Clicking a file opens it in a code editor (Monaco or MDX rich editor) on the left, with a rendered preview on the right, separated by a draggable splitter.

**Filetree mode is deeply unstable.** That's what you're here to fix.

---

## Architecture (How Filetree Mode Works)

Understanding this architecture is critical. The instability comes from the tension between Astro's MPA nature and filetree mode's SPA-like behavior.

### The Coordination Problem

Astro renders full HTML pages server-side. There is no client-side router. But filetree mode needs to:
1. Show a persistent file tree sidebar
2. Load file content into an editor without full page navigation
3. Show a rendered preview of the file without full page navigation

This means filetree mode **fights the framework**. It uses `fetch()` to grab rendered pages, parses them with `DOMParser`, extracts the preview content, and injects it into a React-managed panel. Meanwhile, the editor loads raw file content via a separate API endpoint.

### Component Map

```
DocsSidebar.astro
  ├── Sections view (standard Starlight nav)
  └── Filetree view
       └── DocsSidebarFileTree.tsx (Ark UI TreeView, React island)
            └── On click → dispatches 'shell-file-select' event

DocsTwoColumnContent.astro (THE LAYOUT ORCHESTRATOR)
  ├── Astro template
  │    ├── .content-work-area container
  │    ├── WorkbenchSplitter.tsx (React island, Ark UI Splitter)
  │    │    ├── Editor panel → SplitEditorView.tsx (React island)
  │    │    │    ├── EditorTabStrip.tsx (Source/Rich toggle)
  │    │    │    ├── Monaco editor (source mode)
  │    │    │    └── MDX rich editor (rich mode)
  │    │    └── Preview panel → <div data-shell="splitter-preview" />
  │    └── .wa-preview (Starlight's rendered content, hidden in filetree mode)
  │
  └── Inline script (is:inline, ~235 lines, CANNOT import ES modules)
       ├── syncCurrentPreviewIntoShell() — copies .wa-preview into splitter preview on load
       ├── loadRepoPreviewIntoShell(url) — fetches page HTML, extracts preview, injects it
       ├── Listens for 'shell-file-select' → loads file into editor + preview
       ├── Listens for 'shell-preview-refresh' → updates preview after editor loads content
       └── Listens for 'shell-file-reset' → clears editor state
```

### Event Flow (What Happens When You Click a File)

1. User clicks a file in `DocsSidebarFileTree.tsx`
2. Component calls `selectFile()` from `shell-state.ts`, dispatching `shell-file-select` CustomEvent
3. The inline script in `DocsTwoColumnContent.astro` catches this event
4. For **repo files**: it calls `loadRepoPreviewIntoShell(docsHref)` which fetches the rendered page and extracts `.wa-preview` content
5. `SplitEditorView.tsx` also catches the event, loads the raw file content via `/api/docs-file`, and displays it in the editor
6. After loading content, `SplitEditorView.tsx` emits `shell-preview-refresh` — **BUT only for local files** (this is a known bug, see below)

### The Inline Script Problem

The inline script in `DocsTwoColumnContent.astro` uses `is:inline`, which means:
- It **cannot** `import` from ES modules
- It **duplicates** constants from `shell-state.ts` (event names, storage keys)
- It runs immediately when the page loads, potentially **before** React islands hydrate
- It needs to find `[data-shell="splitter-preview"]` which is rendered by `WorkbenchSplitter.tsx` — a React component that may not have hydrated yet

---

## Known Symptoms (What's Broken)

These are observed behaviors, not diagnosed root causes:

1. **Content disappears entirely on some pages** — you navigate to a page in filetree mode and see nothing in either the editor or preview panel
2. **The splitter/divider vanishes** — the draggable column divider between editor and preview disappears, leaving only one panel visible (or neither)
3. **Layout jumps when navigating between files** — instead of smoothly swapping content, the entire layout rebuilds/flashes
4. **MDX editor appears briefly then disappears** — the rich editor renders for a split second then vanishes
5. **Some pages show preview only, some show nothing** — inconsistent behavior across different doc files
6. **Preview doesn't update for repo files** — clicking repo files in the tree loads the editor but the preview panel stays stale

---

## Known Code-Level Issues

These have been identified from code reading but **have not been confirmed as root causes through browser evidence**:

### Issue 1: Preview refresh only fires for local files
**File:** `SplitEditorView.tsx`, around line 476
```tsx
if (requestFile.sourceKind === 'local') {
  emitPreviewRefresh({...});
}
```
`emitPreviewRefresh` is only called for local files (from File System Access API). Repo files (from `src/content/docs/`) never trigger the preview refresh event, so the preview panel doesn't update when you click a repo file in the tree.

### Issue 2: Race condition — inline script vs React hydration
**File:** `DocsTwoColumnContent.astro`, `syncCurrentPreviewIntoShell()` function
The inline script polls for `[data-shell="splitter-preview"]` using `requestAnimationFrame` for up to 30 frames (~500ms). If React hasn't hydrated `WorkbenchSplitter.tsx` by then, the preview target element doesn't exist and sync silently fails. The splitter appears empty.

### Issue 3: URL mismatch in preview refresh
**File:** `DocsTwoColumnContent.astro`, `refreshRepoPreview()` function
When the preview refresh event fires, `refreshRepoPreview()` uses `window.location.href` to fetch the rendered page. But if `history.replaceState` hasn't run yet (or the URL doesn't match the selected file), it fetches the wrong page or the current page.

### Issue 4: Constants duplicated between inline script and ES modules
The inline script duplicates event names and storage keys from `shell-state.ts` because `is:inline` scripts can't import. If these fall out of sync, events silently fail.

---

## Your Task

### Phase 1: Gather Evidence
**Do not attempt fixes until you understand what's actually happening in the browser.**

1. Run `npm run dev` from `web-docs/`
2. Open the site at `localhost:4421`
3. Switch to filetree mode via the sidebar toggle
4. Open browser DevTools and check:
   - **Console**: Are there errors? Warnings? Failed event dispatches?
   - **Elements/DOM**: Does `[data-shell="splitter-preview"]` exist? Does it have content? What's the state of `data-shell-mode` on `<html>`?
   - **Network**: When you click a file, do you see the fetch requests? Do they succeed? What HTML comes back?
   - **Performance**: Is there a layout thrashing pattern? Components mounting/unmounting rapidly?

5. Document what you find. Screenshots, console output, DOM snapshots.

### Phase 2: Diagnose Root Causes
Based on evidence (not theory), identify:
- Which component(s) are failing
- At what point in the lifecycle the failure occurs
- Whether it's a timing issue, a data flow issue, or a structural issue

### Phase 3: Fix
- Make minimal, targeted fixes
- Test each fix in isolation before combining
- Verify in both `sections` and `filetree` modes
- Verify across page navigations (click multiple files in sequence)

---

## File Reference

These files are all in `FILETREE-MODE-SOURCE.md`, in order:

| # | File Path | Role |
|---|-----------|------|
| 1 | `src/lib/docs/shell-state.ts` | Event constants, types, dispatch helpers |
| 2 | `src/components/DocsTwoColumnContent.astro` | Layout orchestrator, inline script for preview sync |
| 3 | `src/components/SplitEditorView.tsx` | Editor component (Monaco + MDX), file load/save |
| 4 | `src/components/WorkbenchSplitter.tsx` | Ark UI Splitter, editor + preview panels |
| 5 | `src/components/DocsSidebar.astro` | Sidebar with sections/filetree toggle |
| 6 | `src/components/DocsSidebarFileTree.tsx` | File tree (Ark UI TreeView) |
| 7 | `src/components/EditorTabStrip.tsx` | Source/Rich editor toggle |
| 8 | `src/components/ScrollWrapper.tsx` | Ark UI ScrollArea wrapper |
| 9 | `src/styles/splitter.css` | Splitter layout styles |
| 10 | `src/styles/split-editor.css` | Editor surface styles |
| 11 | `src/styles/scroll-area.css` | Custom scrollbar styles |
| 12 | `src/pages/api/docs-file.ts` | REST endpoint for file read/write |
| 13 | `src/lib/docs/content-tree.mjs` | Build-time file tree generator |
| 14 | `src/lib/docs/local-file-handles.ts` | IndexedDB handle persistence |

---

## Key Constraints

- **Astro is an MPA.** You cannot add a client-side router. Every "navigation" is a full page load unless you intercept it.
- **`is:inline` scripts cannot import.** Any shared constants must be duplicated or injected another way.
- **React islands hydrate independently.** There is no guaranteed order. The inline script may run before, during, or after any React component mounts.
- **Starlight owns the outer layout.** You're working within Starlight's component override system. The `<slot />` in `DocsTwoColumnContent.astro` receives Starlight's rendered content.
- **Both modes must work.** Fixing filetree mode must not break sections mode.

---

## How to Use FILETREE-MODE-SOURCE.md

The source document contains 14 fenced code blocks, each preceded by a heading with the file path. To work with these files:

1. Read the full document to understand the codebase
2. Make your changes in the code blocks
3. Extract each modified code block and write it back to its file path in the project
4. Test with `npm run dev`

The file paths are relative to `web-docs/`. For example, `src/components/SplitEditorView.tsx` maps to `web-docs/src/components/SplitEditorView.tsx`.
