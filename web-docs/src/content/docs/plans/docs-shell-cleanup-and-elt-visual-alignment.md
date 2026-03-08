---
title: "Docs Shell Cleanup and ELT Visual Alignment"
description: "Fix operational bugs, eliminate contract drift, and restyle the docs editor/preview workbench to visually match the ELT surface — without changing shell architecture."
status: in-progress
created: 2026-03-07
updated: 2026-03-08
---

## Goal

Bring all `web-docs/src` code into alignment with the live contracts (`app-shell-contracts.md`, `design-token-contracts.md`), fix the operational bugs found during the static audit, and restyle the split editor/preview workbench so it visually matches the ELT surface appearance. No structural or architectural changes to shell ownership.

## Contracts in scope

| Contract | File |
|---|---|
| App shell | `src/content/docs/internal/contracts/app-shell-contracts.md` |
| Design tokens | `src/content/docs/internal/contracts/design-token-contracts.md` |

## Pre-work: update the design-token contract doc

**Status: not started**

The contract doc is stale. Before touching code, update `design-token-contracts.md` to reflect the actual runtime values in `global.css`:

| Field | Contract doc says | `global.css` actually has |
|---|---|---|
| `--app-font-sans` | `"Nunito", ...` | `"Plus Jakarta Sans", ...` |
| Imported fonts | Inter, JetBrains Mono, Nunito | JetBrains Mono, Plus Jakarta Sans (after Phase 2 cleanup) |
| `--separator` token | listed as a core token | not present; `--border` is used directly |
| `--chrome` token | not listed | present in `global.css` as `#0e0e0e` / `#ffffff` |
| Sidebar tokens | `--sidebar-border` listed as `var(--separator)` | actually `#2a2a2a` (dark) / `#e8e5e3` (light) |
| Light-mode `--muted-foreground` | `#57534e` | `#44403c` |
| Icon tokens | listed as "Current Exceptions" | now first-class: `--icon-folder`, `--icon-markdown`, `--brand-block` |

Fix these so the contract doc matches the code, not the other way around. The code is correct; the doc drifted.

---

## Phase 1 — Fix operational bugs

**Status: complete**

### 1.1 Fix repo-save auth model ✓

**Implemented approach:** Hybrid of Option A and C from the original plan.

- Removed all client-side token logic from `writeRepoFile()` in `SplitEditorView.tsx`. The client now sends a plain `POST` with `Content-Type: application/json` and no `Authorization` header. No env vars are read from browser code.
- Updated `isAuthorized()` in `docs-file.ts` to a two-tier model:
  - If `DOCS_FILE_WRITE_TOKEN` is set, enforce bearer token auth (production path).
  - If no token is set, allow writes only when `import.meta.env.DEV` is true.
  - Same-origin check applies in both cases when `host` and `origin` headers are present.
- The `(import.meta as any).env` cast was removed entirely.

### 1.2 Improve save error reporting ✓

- Added `SaveResult` type: `{ ok: boolean; error?: string }`.
- `writeRepoFile()` now parses the JSON error body from the API on failure and returns the specific error string.
- `writeLocalFile()` now catches and returns the error message instead of a bare `false`.
- `saveFile()` return type updated to `SaveResult`.
- `SaveIndicator` now accepts `errorDetail` and displays it instead of the generic "Save failed".
- Error flash duration increased from 1.8s to 3s.
- Added `saveError` state to `SplitEditorView` and wired it through the `save()` callback.

### 1.3 Fix local-folder restore brittleness ✓

- When `queryPermission` returns `'prompt'` (not `'granted'`), the file tree now shows a `ReauthState` component: "Folder access expired" with the folder name and a "Reconnect" button.
- Reconnect calls `requestPermission({ mode: 'readwrite' })`, which triggers the browser's permission prompt.
- A "Dismiss" button lets the user clear the stale folder reference.
- Stale/errored handles also show the reconnect state instead of silently catching.

### 1.4 Handle folder-selection exceptions ✓

- `selectFolder()` now catches all exceptions. `AbortError` is still silently ignored (user cancelled).
- All other errors set a `folderError` state, which renders a `FolderErrorState` component with the error message and a "Try Again" button.
- Browser API unsupported case uses the same error state instead of `alert()`.
- New CSS classes added in `DocsSidebar.astro`: `.docs-tree-empty__detail`, `.docs-tree-empty__button--muted`, and inline flex layout for button icons.

---

## Phase 2 — Eliminate contract drift

**Status: complete**

### 2.1 Shell-state constants in DocsSidebar.astro ✓

The `<script is:inline>` must stay inline — it runs before hydration to restore shell mode and prevent FOUC. Converting to a module script would cause a flash where sections mode renders briefly before filetree mode is restored.

**Implemented approach (fallback):** Added a canonical-source comment block at the top of the inline script mapping each local constant to its `shell-state.ts` export name:

```js
// Canonical source: src/lib/docs/shell-state.ts
// Duplicated here because is:inline scripts cannot import ES modules.
const SHELL_ATTR = 'data-shell-mode';           // SHELL_MODE_ATTR
const SHELL_STORAGE = 'shell-mode';              // SHELL_MODE_STORAGE_KEY
const FILE_STORAGE = 'shell-selected-file';      // FILE_STORAGE_KEY
const FILE_RESET_EVENT = 'shell-file-reset';     // SHELL_FILE_RESET_EVENT
```

### 2.2 Shell-state constants in DocsTwoColumnContent.astro ✓

Same approach as 2.1. Added declared constants at the top of the inline script and replaced all raw string usages in the script body:

```js
// Canonical source: src/lib/docs/shell-state.ts
const FILE_STORAGE_KEY = 'shell-selected-file';      // FILE_STORAGE_KEY
const PREVIEW_REFRESH_EVENT = 'shell-preview-refresh'; // SHELL_PREVIEW_REFRESH_EVENT
const FILE_SELECT_EVENT = 'shell-file-select';        // SHELL_FILE_EVENT
const FILE_RESET_EVENT = 'shell-file-reset';          // SHELL_FILE_RESET_EVENT
const SPLIT_RATIO_KEY = 'shell-split-ratio';          // SPLIT_RATIO_STORAGE_KEY
```

All `localStorage.setItem/getItem('shell-split-ratio')` and `window.addEventListener('shell-...')` calls now use these declared constants.

### 2.3 Shell-editor-mode and preview-refresh events in shell-state.ts ✓

Added three new exports to `shell-state.ts`:
- `SPLIT_RATIO_STORAGE_KEY = 'shell-split-ratio'`
- `SHELL_EDITOR_MODE_EVENT = 'shell-editor-mode'`
- `SHELL_PREVIEW_REFRESH_EVENT = 'shell-preview-refresh'`

Updated consumers:
- `EditorTabStrip.tsx` now imports and uses `SHELL_EDITOR_MODE_EVENT`.
- `SplitEditorView.tsx` now imports and uses both `SHELL_EDITOR_MODE_EVENT` and `SHELL_PREVIEW_REFRESH_EVENT`.

### 2.4 Move hard-coded icon colors into tokens ✓

Added to `global.css` `:root`:
```css
--icon-folder: #d1ab6f;
--icon-markdown: #8aa9ff;
--brand-block: var(--sl-color-white);
```

Added light-mode override:
```css
:root[data-theme='light'] { --brand-block: #1f1f1f; }
```

Updated consumers:
- `DocsSidebar.astro`: `#d1ab6f` → `var(--icon-folder)`, `#8aa9ff` → `var(--icon-markdown)`.
- `SiteTitle.astro`: Removed the `:root[data-theme='light'] .brand-block` scoped override. `.brand-block` now uses `var(--brand-block)` directly, which handles both themes via the global token.

### 2.5 Remove unused font imports ✓

Removed from `global.css`:
- `@fontsource/inter` — 4 weights (400, 500, 600, 700)
- `@fontsource/dm-sans` — 4 weights (400, 500, 600, 700)
- `@fontsource/outfit` — 4 weights (400, 500, 600, 700)

12 fewer font asset imports total. The proposals page references `Inter` in its inline style, but it uses `system-ui` as fallback and will be overhauled in Phase 4.

Remaining imports: JetBrains Mono (400, 500) and Plus Jakarta Sans (400, 500, 600, 700).

### 2.6 Update stale Keystatic comments ✓

Updated the ASCII diagram in `DocsTwoColumnContent.astro`:
- `Editor|Keystatic` → `Source | Rich`
- `KeystaticSurface` / `Keystatic embed` → `RichSurface` / `MDXEditor`
- Code comment referencing "SourceSurface and KeystaticSurface" → "Source and Rich (MDXEditor)"

Remaining Keystatic references in `src/` are in content docs (the old `shell-contract-spec.md`, the keystatic integration reference page) and `sidebar-order.mjs` (folder path) — all documentation, not code.

---

## Phase 3 — Restyle workbench to match ELT appearance

**Status: not started**

This phase is visual-only. Shell ownership, event model, and state management are unchanged.

### 3.1 Study ELT reference surfaces

Before writing CSS, read and describe the ELT workbench appearance from:
- `web/src/components/document-test/DocumentTest.tsx` (overall workbench layout)
- `web/src/components/document-test/PreviewTabPanel.tsx` (preview panel chrome)
- `web/src/styles/theme.css` (workbench-relevant tokens and treatment)

Document the specific visual properties to port:
- Strip/header height, background, border treatment
- Tab styling (active indicator, font, spacing)
- Editor panel background and padding
- Preview panel background, padding, and scroll behavior
- Divider width, color, hover treatment
- Overall proportions and spacing feel

### 3.2 Restyle the work-area strip

**File:** `src/components/DocsTwoColumnContent.astro` (strip styles)

Match ELT's strip/header treatment:
- Background color (likely `--editor-chrome-bg` or `--card`)
- Height, padding, font size
- Tab indicator style (underline weight, color, transition)
- Preview header label styling
- Border treatment between strip and content area

**Implementation note from Phase 2:** The strip already uses `var(--separator)` for borders and `var(--app-font-sans)` for tab text, so the token system is well-positioned for visual changes.

### 3.3 Restyle the editor column

**Files:** `src/styles/split-editor.css`, `src/components/DocsTwoColumnContent.astro`

Match ELT's editor panel appearance:
- Background (editor pane bg vs shell bg differentiation)
- Internal padding
- Monaco editor options (font size, line height, padding)
- Loading/empty state appearance

**Implementation note:** The editor surface already uses `--editor-*` tokens from `split-editor.css`. The MDXEditor toolbar uses `--editor-chrome-bg` for background. These tokens derive from the Starlight bridge, so restyling should only require adjusting the token values or adding a few overrides.

### 3.4 Restyle the preview column

**File:** `src/components/DocsTwoColumnContent.astro`

Match ELT's preview panel appearance:
- Background differentiation from editor
- Content padding and max-width
- Scroll behavior and scrollbar treatment
- The local-preview inline renderer styling in `split-editor.css`

**Implementation note:** The local-preview renderer (`renderLocalMarkdown` in the inline script) generates simple HTML with `.split-editor__local-preview` styling. It handles headings, paragraphs, lists, blockquotes, code blocks, and inline code. It does NOT handle: tables, ordered lists (numbered), images, MDX syntax, frontmatter display, or Starlight directives. For Phase 3, the visual treatment is what matters — the renderer fidelity is a separate (Phase 3+ or future) concern.

### 3.5 Restyle the divider

**File:** `src/components/DocsTwoColumnContent.astro`

Match ELT's divider treatment:
- Width (currently 4px — check ELT)
- Default and hover colors
- Cursor style
- Any grab/drag visual feedback

**Implementation note:** The divider logic is in the inline script and already uses `var(--separator)` for default color and `var(--sl-color-text-accent)` for hover. Only CSS changes should be needed.

### 3.6 Restyle the sidebar file tree in filetree mode

**File:** `src/components/DocsSidebar.astro`

Match ELT's tree/panel appearance where applicable:
- Row height, padding, font size
- Selected item highlight treatment
- Folder/file icon sizing and opacity
- Indent guide appearance
- Empty state styling (now includes `ReauthState` and `FolderErrorState` from Phase 1)

**Implementation note from Phase 1:** Three new UI states were added to the file tree (reauth, folder error, empty). These should all be styled consistently with whatever visual language Phase 3 establishes. The new CSS classes are: `.docs-tree-empty__detail`, `.docs-tree-empty__button--muted`.

### 3.7 Verify both themes

After all restyling, verify both dark and light themes. The ELT visual alignment should work cleanly in both modes using the existing token system.

**Implementation note:** Icon tokens (`--icon-folder`, `--icon-markdown`) currently have the same value in both themes. During ELT study (3.1), check whether ELT uses different icon tones per theme.

---

## Phase 4 — Proposals cleanup

**Status: not started**

### 4.1 Bring /proposals under the shared shell

**Severity:** Major
**File:** `src/pages/proposals/index.astro`

**Problem:** The proposals page renders its own `<html>`, `<body>`, layout chrome, and theme. It uses Inter as its font (which is no longer imported after Phase 2.5), a blue color scheme, and completely different spacing/radius/border conventions. It shares nothing with the docs shell.

**Fix:** This is the largest single task. Options:

- **Option A — Full Starlight integration.** Rewrite `/proposals` as a Starlight page that uses the shared shell (DocsSidebar, DocsHeader, DocsTwoColumnContent). The proposals workspace becomes a mode or view within the existing shell. This is the cleanest but most work.
- **Option B — Shared layout wrapper.** Keep `/proposals` as a standalone page but import the shared header, token system, and font stack. The proposals page uses the docs token system and font, with its own content layout. Less work, still eliminates most drift.
- **Option C — Token-only alignment.** Keep the standalone page structure but replace all hard-coded colors, fonts, and spacing with the docs token variables. Minimal structural change, eliminates visual drift.

Recommend **Option B** as the pragmatic middle ground.

**Implementation note from Phase 2.5:** Since Inter, DM Sans, and Outfit font imports were removed, the proposals page now falls back to system fonts for its `Inter, system-ui, sans-serif` declaration. This is a minor visual regression but the page is being overhauled anyway. The fix here will replace the font-family with `var(--app-font-sans)`.

**Specific hard-coded values to replace (counted during audit):**
- `#08111f`, `#0d1727` — background gradients
- `#ebf2ff`, `#a8bdd9`, `#9bb2cf`, `#dce8fb` — text colors
- `#4f8cff` — accent/primary blue
- `rgba(163, 188, 229, 0.*)` — border/overlay variants (6+ occurrences)
- `rgba(8, 17, 31, 0.*)` — background variants (3+ occurrences)
- `#091321` — dialog background
- `Inter, system-ui, sans-serif` — font family
- Status-specific colors: green (`rgba(16, 185, 129, ...)`), yellow (`rgba(245, 158, 11, ...)`), red (`rgba(239, 68, 68, ...)`)

### 4.2 Align proposal review write security

**Severity:** Major (relative to docs-file.ts)
**File:** `src/pages/api/proposals/review.ts`

**Problem:** Write authorization is based only on `import.meta.env.DEV || import.meta.env.PROPOSALS_FS_WRITES === 'enabled'`. This is weaker than the `isAuthorized()` check now in `docs-file.ts`.

**Fix:** The auth model from Phase 1.1 established a clear pattern:
- Dev mode: writes allowed without token.
- Production: writes require `DOCS_FILE_WRITE_TOKEN`.
- Same-origin check always applies.

For proposals, the simplest alignment is:
1. Extract `isAuthorized()` from `docs-file.ts` into a shared utility (e.g., `src/lib/docs/write-auth.ts`).
2. Have both `docs-file.ts` and `review.ts` import and use the same function.
3. Remove the `PROPOSALS_FS_WRITES` env var — it becomes redundant under the shared auth model.

Alternatively, if proposals should remain independently gatable, keep the env var but layer the shared `isAuthorized()` check on top of it.

**Implementation note:** `review.ts` delegates to `createProposalReviewResponse()` from `src/lib/proposals/api.mjs`. The `allowWrites` boolean is passed into that function, so the auth gate can be applied at the route level without touching the proposal library.

### 4.3 Add concurrency protection to proposal reviews

**Severity:** Medium
**File:** `src/pages/proposals/index.astro` (line 479)

**Problem:** The review form doesn't send `expectedUpdatedAt`, even though the backend supports it. Concurrent edits can silently overwrite each other.

**Fix:** Add a hidden `<input name="expectedUpdatedAt" value={proposal.updatedAt} />` to the review form. Have the backend reject writes where the file's actual `updatedAt` doesn't match.

### 4.4 Remove dead CSS from proposals page

**Severity:** Minor
**File:** `src/pages/proposals/index.astro` (lines 85–101)

**Problem:** `.top-actions` and `.button-link` styles (including `.button-link.primary`) are defined but never used in the markup.

**Fix:** Delete the unused style rules. This is ~18 lines of dead CSS.

---

## Phase 5 — Type safety and final cleanup

**Status: not started**

### 5.1 Remove `any` type assertions

**Files and specific locations:**

1. **`src/env.d.ts`** — Both virtual module declarations use `any`:
   ```ts
   declare module 'virtual:starlight/user-config' {
     const config: any;  // should be StarlightConfig or similar
   }
   declare module 'virtual:starlight/components/*' {
     const Component: any;  // should be AstroComponent or similar
   }
   ```
   These are Starlight virtual modules. The proper fix is to check if `@astrojs/starlight` exports type declarations for these, or to define minimal typed interfaces. If Starlight doesn't export types, a focused `Record<string, unknown>` is still better than `any`.

2. **`src/components/SplitEditorView.tsx` (line 266)** — The MDXEditor dynamic import destructures 18 exports, all typed as `any`:
   ```ts
   } = MDXEditorMod as unknown as {
     MDXEditor: any;
     headingsPlugin: any;
     // ... 16 more
   };
   ```
   The proper fix is to create a type declaration file `src/types/mdxeditor.d.ts` that types the subset of `@mdxeditor/editor` exports we actually use. Or, if `@mdxeditor/editor` ships its own types (it does), restructure the dynamic import to preserve them.

3. **`src/pages/proposals/index.astro` (line 4)** — `ProposalModule.default: any`. Should be typed as Astro's `AstroComponentFactory` (or `typeof import('astro').AstroComponentFactory`).

4. **`src/components/DocsSidebarFileTree.tsx` (line 224)** — `(handle as any).requestPermission(...)`. The global `FileSystemDirectoryHandle` type declaration (lines 31–34) declares `queryPermission` but not `requestPermission`. Fix by adding `requestPermission` to the interface:
   ```ts
   interface FileSystemDirectoryHandle {
     queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
     requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
     entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
   }
   ```

### 5.2 Final contract doc sync

After all code changes are complete, re-read every file under `src/` and verify:
1. Every token in `design-token-contracts.md` matches `global.css` — including the new `--icon-folder`, `--icon-markdown`, `--brand-block` tokens and the updated font imports.
2. Every shell owner in `app-shell-contracts.md` matches the code.
3. The "Current Exceptions" table is empty (all three former exceptions are now first-class tokens).
4. The "Implementation Status" table is current.
5. The "Live Spec Drift" table in `app-shell-contracts.md` is updated — the Keystatic references can be removed since the code comments now use the correct terminology.
6. The font contract table is updated to reflect Plus Jakarta Sans (not Nunito) and the removal of Inter/DM Sans/Outfit.

---

## Execution order

| Order | Phase | Task | Status |
|---|---|---|---|
| 1 | Pre-work | Update design-token contract doc | not started |
| 2 | 1.1 | Fix repo-save auth | **done** |
| 3 | 1.2 | Improve save error reporting | **done** |
| 4 | 1.3 | Fix local-folder restore | **done** |
| 5 | 1.4 | Handle folder-selection exceptions | **done** |
| 6 | 2.1 | Shell-state constants in DocsSidebar | **done** |
| 7 | 2.2 | Shell-state constants in DocsTwoColumnContent | **done** |
| 8 | 2.3 | Shell-editor-mode event in shell-state | **done** |
| 9 | 2.4 | Icon color tokens | **done** |
| 10 | 2.5 | Remove unused font imports | **done** |
| 11 | 2.6 | Update stale comments | **done** |
| 12 | 3.1 | Study ELT reference surfaces | not started |
| 13 | 3.2–3.6 | Restyle workbench | not started |
| 14 | 3.7 | Verify both themes | not started |
| 15 | 4.1 | Proposals under shared shell | not started |
| 16 | 4.2 | Proposal write security | not started |
| 17 | 4.3 | Proposal concurrency protection | not started |
| 18 | 4.4 | Remove dead proposal CSS | not started |
| 19 | 5.1 | Remove `any` types | not started |
| 20 | 5.2 | Final contract doc sync | not started |

Phase 3 must be done sequentially (3.1 first, then 3.2–3.6, then 3.7).
Phase 4 tasks are mostly independent except 4.2 depends on 1.1 (done).
Phase 5.2 depends on all other phases.

## Files touched (summary)

| File | Phases | Status |
|---|---|---|
| `src/content/docs/internal/contracts/design-token-contracts.md` | Pre-work, 5.2 | not started |
| `src/content/docs/internal/contracts/app-shell-contracts.md` | 5.2 | not started |
| `src/components/SplitEditorView.tsx` | 1.1, 1.2, 2.3 | **done** |
| `src/components/DocsSidebarFileTree.tsx` | 1.3, 1.4 | **done** (note: has `as any` to fix in 5.1) |
| `src/components/DocsSidebar.astro` | 2.1, 2.4, 3.6 | **done** (2.1, 2.4); 3.6 not started |
| `src/components/DocsTwoColumnContent.astro` | 2.2, 2.6, 3.2–3.5 | **done** (2.2, 2.6); 3.2–3.5 not started |
| `src/components/EditorTabStrip.tsx` | 2.3 | **done** |
| `src/components/SiteTitle.astro` | 2.4 | **done** |
| `src/lib/docs/shell-state.ts` | 2.2, 2.3 | **done** |
| `src/styles/global.css` | 2.4, 2.5 | **done** |
| `src/styles/split-editor.css` | 3.3, 3.4 | not started |
| `src/pages/api/docs-file.ts` | 1.1 | **done** |
| `src/pages/proposals/index.astro` | 4.1, 4.3, 4.4, 5.1 | not started |
| `src/pages/api/proposals/review.ts` | 4.2 | not started |
| `src/env.d.ts` | 5.1 | not started |
| `src/lib/docs/write-auth.ts` (new) | 4.2 | not started |
| `src/types/mdxeditor.d.ts` (new, optional) | 5.1 | not started |
