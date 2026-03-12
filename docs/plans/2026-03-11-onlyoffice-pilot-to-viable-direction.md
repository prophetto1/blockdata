# OnlyOffice: Pilot to Viable Direction

> Companion to `2026-03-11-onlyoffice-pilot-implementation-plan.md`. These are changes to promote the OnlyOffice pilot from a self-contained experiment to a first-class feature integrated with the rest of the platform.

---

## 1. Reuse existing auth helpers instead of duplicating them

The pilot duplicates `requireAccessToken()` and writes a custom `authedFetch` inside the component. The codebase already has `web/src/lib/edge.ts` with `requireAccessToken`, `edgeFetch`, and retry-on-401 logic. Additionally, `web/src/pages/settings/services-panel.api.ts` independently duplicates the same `requireAccessToken()` function for its own platform-api calls — making this a codebase-wide problem, not just an OnlyOffice one.

**Change:** `edgeFetch` can't be used directly — it targets Supabase Functions (`/functions/v1/...`), not `VITE_PIPELINE_WORKER_URL`. Extract a shared `platformApiFetch` helper into `lib/` that wraps `requireAccessToken()` from edge.ts with the `VITE_PIPELINE_WORKER_URL` base. Both OnlyOfficePilot and services-panel.api.ts should consume this shared helper instead of maintaining their own copies.

**Why:** Automatic token refresh, consistent error formatting, single place to change if auth patterns evolve. Fixes duplication in two places, not just one.

---

## 2. Register in the editor registry instead of being a standalone page

`web/src/pages/superuser/editorRegistry.ts` has a clean `EditorProfile` contract: `{ id, extensions, viewModes, component }`. The current contract assumes string content in/out (`EditorSurfaceProps.content`/`onChange`), and OnlyOffice is fundamentally different — it owns the document lifecycle via server-side callbacks.

**Changes needed:**

- Add a new `EditorSurfaceId`: extend the union type to `'mdx' | 'code' | 'tiptap' | 'onlyoffice'`
- Define an alternative prop contract for server-managed editors — something like `{ docId: string; filename: string }` instead of `{ content: string; onChange }`. The registry resolver would need to understand that OnlyOffice doesn't participate in the string-content round-trip
- Register `.docx` (and eventually `.xlsx`, `.pptx`) as handled extensions

**Why:** Any workbench pane that opens a `.docx` automatically gets the OnlyOffice editor instead of a read-only preview.

---

## 3. Register a workbench tab type

`web/src/lib/tabRegistry.ts` is how content appears in the multi-pane workbench.

**Change:** Register a tab entry:

```ts
registerTab({
  id: 'view:onlyoffice',
  label: 'OnlyOffice',
  group: 'view',
  render: (props) => <OnlyOfficePanel projectId={props.projectId} />,
});
```

**Why:** Users can open OnlyOffice as a tab alongside previews, code editors, and flow canvases rather than navigating away to a separate page.

---

## 4. Use existing UI components

The pilot uses raw `<button>`, `<label>`, and `<div>` with Tailwind classes.

**Changes:**

- Use `<Button>` from `components/ui/button.tsx` for upload/refresh actions
- Use `<ScrollArea>` from Ark UI for the document list
- Use `<Menu>` components for a right-click context menu on documents (rename, delete, download)
- Use Uppy (`@uppy/core` is already a dependency) for the upload flow instead of a bare `<input type="file">` — gives drag-drop, progress, multi-file, and the same UX pattern as other upload flows in the app

**Why:** Consistent look and behavior with the rest of the app.

---

## 5. Move document metadata to Supabase

The pilot stores metadata as `.meta.json` files on disk alongside the `.docx` files.

**Changes:**

- Store document metadata in a Supabase table (`onlyoffice_documents`) — gives queryability, RLS, timestamps, user ownership, and the ability to share documents across users with proper access control
- Keep the `.docx` files on disk (or move to Supabase Storage / GCS) — the bridge still serves them to the container the same way
- Drop the filesystem `glob("*.meta.json")` pattern in `list_documents` and replace with a proper query

**Why:** Proper access control, queryability, and multi-user support.

---

## 6. Scope beyond superuser

The pilot gates everything behind `require_superuser`.

**Changes:**

- Add a feature flag or role check rather than hard superuser gate — e.g., `require_role("editor")` or a Supabase RLS policy
- Move the nav item out of `SUPERUSER_DRILL` in `web/src/components/shell/nav-config.ts`. Options: add it to an existing drill config (e.g., a new "Tools" section in `SETTINGS_DRILL`) or create a dedicated drill config for editor tools. The item should appear contextually when the user has the required role or the feature flag is enabled.

**Why:** Makes the feature accessible to the intended audience instead of being admin-only.

---

## 7. Add delete/rename/download endpoints

The pilot bridge is upload-and-edit only. The storage directory is a normal filesystem — these operations are trivial, they just weren't in scope for the pilot.

**File:** `services/platform-api/app/api/routes/onlyoffice.py`

**New endpoints:**

### `DELETE /onlyoffice/documents/{doc_id}` — remove from storage

```python
@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    _su: AuthPrincipal = Depends(require_superuser),
):
    """Delete a document and its metadata from server-side storage."""
    meta = _read_meta(doc_id)  # raises 404 if not found
    _doc_path(doc_id).unlink(missing_ok=True)
    _meta_path(doc_id).unlink(missing_ok=True)
    logger.info(f"Deleted {meta.get('filename', doc_id)}")
    return {"deleted": doc_id}
```

### `PATCH /onlyoffice/documents/{doc_id}` — rename

```python
class RenameRequest(BaseModel):
    filename: str

@router.patch("/documents/{doc_id}")
async def rename_document(
    doc_id: str,
    req: RenameRequest,
    _su: AuthPrincipal = Depends(require_superuser),
):
    """Rename a document (updates metadata only — file on disk keeps its doc_id name)."""
    if not req.filename.lower().endswith(".docx"):
        raise HTTPException(400, "Filename must end with .docx")
    meta = _read_meta(doc_id)  # raises 404 if not found
    meta["filename"] = req.filename
    _write_meta(doc_id, meta)
    logger.info(f"Renamed {doc_id} to {req.filename}")
    return meta
```

### `GET /onlyoffice/documents/{doc_id}/download` — browser-facing download

This is distinct from the container-facing `GET /onlyoffice/doc/{doc_id}` which requires the callback token. This endpoint uses Supabase JWT auth so the browser can download directly.

```python
@router.get("/documents/{doc_id}/download")
async def download_document(
    doc_id: str,
    _su: AuthPrincipal = Depends(require_superuser),
):
    """Download a document. Browser-facing, authenticated via Supabase JWT."""
    path = _doc_path(doc_id)
    if not path.is_file():
        raise HTTPException(404, f"Document {doc_id} not found")
    meta = _read_meta(doc_id)
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=meta.get("filename", f"{doc_id}.docx"),
    )
```

### Frontend — wire into the document list sidebar

Add a right-click context menu (using the existing `<Menu>` components from item 4) on each document in the sidebar list with actions: Rename, Download, Delete. Delete should confirm before calling the endpoint.

**Why:** Basic document management; without these the document list only grows and users can't retrieve their own files through the browser.

---

## 8. Handle the OnlyOffice editor instance lifecycle properly

The pilot's module-level `let scriptPromise` singleton for loading the JS API `<script>` tag is actually fine — a `<script>` in the DOM persists across component mounts, and the singleton correctly avoids re-loading it. The pilot also correctly calls `editorRef.current?.destroyEditor()` on unmount.

The real lifecycle concern is broader: when OnlyOffice is embedded as a workbench tab or editor surface (items 2 and 3 above), the editor container div may be removed and re-added to the DOM by the workbench splitter or tab switching. `DocsAPI.DocEditor` does not survive its container being removed from the DOM — it needs to be destroyed and re-created.

**Change:** Wrap the editor mount/destroy logic in a `useOnlyOfficeEditor(containerId, config)` hook that:
- Tracks whether the container div is in the DOM (e.g., via `ResizeObserver` or a ref callback)
- Destroys the editor when the container unmounts
- Re-creates it when the container remounts with the same config
- Exposes editor state (loading, ready, error) for the parent to render appropriately

**Why:** Required for workbench/tab integration where the DOM container lifecycle is controlled externally.

---

## 9. Production networking config

The pilot acknowledges this is deferred but it's needed for viability.

**Changes:**

- The `ONLYOFFICE_BRIDGE_URL` / `ONLYOFFICE_DOCSERVER_URL` split is good — keep it
- Add a health-check endpoint in the bridge that verifies connectivity to the Document Server (e.g., `GET /onlyoffice/health` that pings `{ONLYOFFICE_DOCSERVER_URL}/healthcheck`)
- The Vite proxy (`/oo-api`) is dev-only. For production, add a reverse proxy rule (nginx/Caddy) or serve the OnlyOffice JS API from the same origin

**Why:** The bridge needs to be observable and the JS API needs to be servable without a Vite dev server.

---

## Summary

The pilot's architecture (bridge pattern, two trust boundaries, content-hash doc keys, SSRF protection) is solid. The main gap between "pilot" and "viable direction" is **integration** — plugging into the existing editor registry, tab system, auth helpers, and UI components rather than standing alone. The backend bridge is mostly production-ready as designed; the frontend is where the refactoring lives.