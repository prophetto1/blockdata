# Docs Editor Page — Requirements

**Goal:** Standalone document editor page at `/app/docs`, completely independent from the ELT workbench.

## Requirements

1. **New route:** `/app/docs` — top-level page, no shared state with ELT
2. **Left sidebar — file list:**
   - **Assets tab:** list of DOCX files from Supabase (reuse existing fetch from `fetchAllProjectDocuments`)
   - **Files tab:** local folder via File System Access API (reuse `WorkspaceFileTree`)
   - Click a file to open it in the editor
3. **Right area — OnlyOffice editor:**
   - Full width/height, no preview mode — always editor
   - For Assets: reuse existing `OnlyOfficeEditorPanel` + `useOnlyOfficeEditor`
   - For local files: browser uploads file bytes to a new bridge endpoint (`POST /onlyoffice/open-local`), then same editor flow
4. **Save-back for local files:**
   - Bridge notifies frontend when Document Server saves (via callback status)
   - Frontend downloads modified file from bridge and writes back to local disk via `FileSystemWritableFileStream`
5. **No coupling to ELT:** does not import from `useEltWorkbench`, workbench state, or pane system
