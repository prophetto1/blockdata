# Filetree mode fixes

## What changed

Updated files:

- `src/components/DocsSidebar.astro`
- `src/components/DocsTwoColumnContent.astro`
- `src/components/SplitEditorView.tsx`
- `src/components/WorkbenchSplitter.tsx`
- `src/lib/docs/content-tree.mjs`

## Main fixes

1. Hydration-safe splitter sizing
   - `WorkbenchSplitter.tsx` no longer reads `localStorage` during the initial render.
   - The splitter now renders with a stable 50/50 server/client initial state and applies saved panel sizes after mount.

2. Hydration-safe initial editor file selection
   - `SplitEditorView.tsx` no longer reads `sessionStorage` during the initial render.
   - The editor restores selection after mount, preventing server/client render drift.
   - Repo pages now default to the current document file when available.

3. Repo preview refresh now follows the selected file
   - Repo files now emit `shell-preview-refresh` after load and after save.
   - Preview refresh no longer depends on `window.location.href` being perfectly in sync.
   - The preview URL comes from the selected file metadata.

4. Preview fetches are now race-safe
   - `DocsTwoColumnContent.astro` aborts stale repo preview fetches.
   - Rapid file clicks no longer allow older responses to overwrite newer previews.

5. Filetree preview bootstrap is no longer one-shot
   - The preview sync now re-runs when `data-shell-mode` flips to `filetree`.
   - This removes the “mode script ran after content script” blank-preview case.

6. Current page metadata is exposed to the client shell
   - `DocsTwoColumnContent.astro` now annotates `.wa-preview` with the current repo file path, extension, and docs href.
   - `SplitEditorView.tsx` uses that data to open the current repo page automatically.

7. Leaving filetree for sections now reloads repo pages correctly
   - `DocsSidebar.astro` now does a full navigation back to the selected repo doc when switching from filetree to sections.
   - This restores the correct Starlight TOC and full-page server render.

## Notes

This workspace did not include the full `web-docs/` project, so these changes were produced from the provided source files and checked for JS/TS syntax only.
