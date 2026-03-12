# OnlyOffice ELT Workbench Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a user clicks a `.docx` file in the ELT workbench assets panel, they see a read-only preview (existing `DocxPreview`) with an "Edit in OnlyOffice" toggle that switches to a live OnlyOffice editor — all within the same workbench tab, using the existing Supabase Storage pipeline for file storage.

**Architecture:** The OnlyOffice Document Server is a server-native editor — it fetches documents from a URL and saves via callback. It cannot fetch directly from Supabase Storage (signed URLs expire, no callback mechanism). So platform-api acts as a **shuttle**: on edit-open it pulls the `.docx` from Supabase Storage into a local cache, serves it to the OnlyOffice container, and on save callback writes the modified file back to Supabase Storage. The frontend adds a preview/edit mode toggle to `PreviewTabPanel` for `.docx` files. No new pages, no new routes, no separate upload flow — OnlyOffice plugs into the existing document pipeline.

**Infra reuse:** The bridge router reuses existing platform-api infrastructure modules (`5b30042`) instead of creating inline clients:
- `get_supabase_admin()` from `app.infra.supabase_client` — cached singleton with proper error handling
- `download_bytes()` from `app.infra.http_client` — for downloading modified files from the OnlyOffice container
- `download_from_storage()` from `app.infra.storage` — for pulling files from Supabase Storage on open
- `upsert_to_storage()` (new) from `app.infra.storage` — for writing modified files back with `x-upsert: true` header (existing `upload_to_storage` only does POST/create, not overwrite)

**Tech Stack:** React 19, FastAPI (platform-api), PyJWT, supabase-py, OnlyOffice Document Server (Docker, Community Edition), Vite dev proxy

**What this proves:** That OnlyOffice can live inside the existing workbench tab system without a separate UI, using the existing Supabase Storage pipeline — not that OnlyOffice works (it's a mature project).

---

## Phase 0 — Dependencies & Networking

### Task 0.1: Verify OnlyOffice Document Server is running and reachable

> This task is specific to local development. Other topologies configure `ONLYOFFICE_BRIDGE_URL` instead.

**Files:**
- Verify: `services/onlyoffice/docker-compose.yml`

**Step 1: Confirm extra_hosts is set on the documentserver service**

```yaml
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

**Step 2: Start the stack**

```bash
cd services/onlyoffice && docker compose up -d
```

**Step 3: Wait for healthy status and verify**

```bash
docker compose exec documentserver curl -sf http://localhost/healthcheck
# Expected: true
```

**Step 4: Verify host access from inside the container**

```bash
docker compose exec documentserver curl -s http://host.docker.internal:8000/health
# Expected: {"status":"ok",...}
```

If platform-api isn't running:
```bash
cd services/platform-api && uvicorn app.main:app --port 8000
```

---

### Task 0.2: Add dependencies to platform-api

**Files:**
- Modify: `services/platform-api/requirements.txt`

**Step 1: Add dependencies**

Append:
```
PyJWT>=2.8
```

`PyJWT` signs OnlyOffice editor configs. (The older pilot plan included `python-multipart` for `UploadFile` endpoints, but this version has no upload endpoint — the bridge pulls files from Supabase Storage, not from browser uploads.)

**Step 2: Install**

```bash
cd services/platform-api && pip install -r requirements.txt
```

**Step 3: Commit**

```bash
git add services/platform-api/requirements.txt
git commit -m "deps: add PyJWT for onlyoffice bridge"
```

---

## Phase 1 — Platform-API Bridge (Supabase Storage Shuttle)

The bridge's job is to shuttle files between Supabase Storage and the OnlyOffice container. It does not have its own permanent storage — it uses a local cache directory for the duration of an editing session.

### Task 1.1: Add OnlyOffice settings to config

**Files:**
- Modify: `services/platform-api/app/core/config.py`

**Step 1: Add fields to the Settings dataclass**

```python
    onlyoffice_jwt_secret: str = ""
    onlyoffice_storage_dir: str = ""
    onlyoffice_bridge_url: str = ""
    onlyoffice_docserver_url: str = ""
    onlyoffice_docserver_internal_url: str = ""
```

> **Removed:** `onlyoffice_callback_token` — the old design leaked a static shared secret to the browser via the editor config. Replaced with per-session signed JWTs (see Task 1.3).
>
> **Added:** `onlyoffice_docserver_internal_url` — the hostname the OnlyOffice container uses in its callback URLs (e.g., `http://documentserver:9980`), which may differ from `onlyoffice_docserver_url` (the browser-facing URL). Used for SSRF validation in the save callback.

**Step 2: Load them in `from_env()`**

Add to the `return cls(...)` call:

```python
    onlyoffice_jwt_secret=os.environ.get("ONLYOFFICE_JWT_SECRET", "my-jwt-secret-change-me"),
    onlyoffice_storage_dir=os.environ.get("ONLYOFFICE_STORAGE_DIR", "/app/cache/onlyoffice"),
    onlyoffice_bridge_url=os.environ.get("ONLYOFFICE_BRIDGE_URL", "http://host.docker.internal:8000"),
    onlyoffice_docserver_url=os.environ.get("ONLYOFFICE_DOCSERVER_URL", "http://localhost:9980"),
    onlyoffice_docserver_internal_url=os.environ.get("ONLYOFFICE_DOCSERVER_INTERNAL_URL", "http://localhost:9980"),
```

**Step 3: Commit**

```bash
git add services/platform-api/app/core/config.py
git commit -m "config: add onlyoffice settings (jwt, cache dir, bridge url, docserver url)"
```

---

### Task 1.2: Add `upsert_to_storage` helper to infra/storage.py

The existing `upload_to_storage()` does a POST (create). The save callback needs to **overwrite** existing files. Add an upsert variant.

**Files:**
- Modify: `services/platform-api/app/infra/storage.py`

**Step 1: Append `upsert_to_storage` after `download_from_storage`**

```python
async def upsert_to_storage(
    supabase_url: str,
    supabase_key: str,
    bucket: str,
    path: str,
    content: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload bytes to Supabase Storage, overwriting if the file exists. Returns the public URL."""
    url = f"{supabase_url}/storage/v1/object/{bucket}/{path}"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            content=content,
            headers={
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": content_type,
                "x-upsert": "true",
            },
        )
        resp.raise_for_status()
    return f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"
```

**Step 2: Commit**

```bash
git add services/platform-api/app/infra/storage.py
git commit -m "feat: add upsert_to_storage helper with x-upsert header"
```

---

### Task 1.3: Create the OnlyOffice bridge router

**Files:**
- Create: `services/platform-api/app/api/routes/onlyoffice.py`

This bridge is a **Supabase Storage shuttle** — it pulls files from Supabase Storage into a local cache for the OnlyOffice container to access, and writes modified files back to Supabase Storage on save callback.

> **Infra reuse:** This router uses existing infra modules instead of inline clients:
> - `get_supabase_admin()` from `app.infra.supabase_client` — cached singleton, proper error handling
> - `download_bytes()` from `app.infra.http_client` — for downloading modified files from the OnlyOffice container
> - `download_from_storage()` from `app.infra.storage` — for pulling files from Supabase Storage on open
> - `upsert_to_storage()` from `app.infra.storage` — for writing modified files back (with `x-upsert: true`)

**Endpoints:**

| Endpoint | Purpose | Called by |
|---|---|---|
| `POST /onlyoffice/open` | Pull file from Supabase Storage into local cache, return `session_id` | Browser |
| `POST /onlyoffice/config` | Generate JWT-signed editor config for an open session | Browser |
| `GET /onlyoffice/doc/{session_id}` | Serve cached file to OnlyOffice container | OnlyOffice container |
| `POST /onlyoffice/callback/{session_id}` | Receive save callback, download modified file, write back to Supabase Storage | OnlyOffice container |

**Step 1: Write the router**

```python
# services/platform-api/app/api/routes/onlyoffice.py
"""OnlyOffice Document Server bridge — Supabase Storage shuttle.

Pulls files from Supabase Storage into a local cache for the OnlyOffice
container to access. On save callback, downloads the modified file from
the container and writes it back to Supabase Storage.

Auth model:
- Browser-facing routes: Depends(require_auth) — Supabase JWT + session owner check
- Container-facing routes: per-session signed JWT (short-lived, scoped to one session)
  The browser never receives a reusable bridge secret. The /config endpoint
  generates scoped JWTs that are embedded in the document/callback URLs.
  The container presents these JWTs back to the bridge on doc-fetch and callback.

Infra reuse:
- get_supabase_admin() from app.infra.supabase_client (not inline create_client)
- download_bytes() from app.infra.http_client (not inline httpx)
- download_from_storage() / upsert_to_storage() from app.infra.storage
"""

import hashlib
import json
import logging
import time
import uuid
from pathlib import Path
from urllib.parse import urlparse

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.auth.dependencies import require_auth, AuthPrincipal
from app.core.config import get_settings
from app.infra.http_client import download_bytes
from app.infra.storage import download_from_storage, upsert_to_storage
from app.infra.supabase_client import get_supabase_admin

logger = logging.getLogger("platform-api.onlyoffice")

router = APIRouter(prefix="/onlyoffice", tags=["onlyoffice"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DOCUMENTS_BUCKET = "documents"
DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
SESSION_TOKEN_TTL = 3600 * 8  # 8 hours — covers a long editing session


def _cache_dir() -> Path:
    d = Path(get_settings().onlyoffice_storage_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _session_meta_path(session_id: str) -> Path:
    return _cache_dir() / f"{session_id}.meta.json"


def _session_doc_path(session_id: str) -> Path:
    return _cache_dir() / f"{session_id}.docx"


def _read_session(session_id: str) -> dict:
    mp = _session_meta_path(session_id)
    if not mp.is_file():
        raise HTTPException(404, f"Session {session_id} not found")
    return json.loads(mp.read_text())


def _write_session(session_id: str, meta: dict) -> None:
    _session_meta_path(session_id).write_text(json.dumps(meta))


def _content_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:16]


def _sign_config(payload: dict) -> str:
    """Sign the OnlyOffice editor config payload (JWT for the editor iframe)."""
    secret = get_settings().onlyoffice_jwt_secret
    if not secret:
        raise HTTPException(500, "ONLYOFFICE_JWT_SECRET not configured")
    return jwt.encode(payload, secret, algorithm="HS256")


def _sign_session_token(session_id: str) -> str:
    """Create a short-lived, per-session JWT for container-facing routes.

    This replaces the old static ONLYOFFICE_CALLBACK_TOKEN design. The token
    is scoped to a single session_id and expires after SESSION_TOKEN_TTL.
    The browser receives this token embedded in the editor config URLs, but
    it cannot be reused across sessions or after expiry.
    """
    secret = get_settings().onlyoffice_jwt_secret
    if not secret:
        raise HTTPException(500, "ONLYOFFICE_JWT_SECRET not configured")
    payload = {
        "sub": session_id,
        "purpose": "oo-session",
        "exp": int(time.time()) + SESSION_TOKEN_TTL,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def _verify_session_token(session_id: str, token: str) -> None:
    """Verify a per-session JWT on container-facing routes.

    Checks signature, expiry, and that the token is scoped to the
    requested session_id.
    """
    secret = get_settings().onlyoffice_jwt_secret
    if not secret:
        raise HTTPException(500, "ONLYOFFICE_JWT_SECRET not configured")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid session token")
    if payload.get("sub") != session_id or payload.get("purpose") != "oo-session":
        raise HTTPException(401, "Token does not match session")


# ---------------------------------------------------------------------------
# 1. Open — look up document, verify ownership, pull from Supabase Storage
# ---------------------------------------------------------------------------

class OpenRequest(BaseModel):
    source_uid: str  # Only accept the document identifier — NOT a storage path


@router.post("/open")
async def open_document(
    req: OpenRequest,
    _auth: AuthPrincipal = Depends(require_auth),
):
    """Look up a document by source_uid, verify ownership, then pull from
    Supabase Storage into the local cache for editing.

    The caller sends only source_uid. The server resolves source_locator
    and filename from the documents_v2 row, ensuring the authenticated
    user owns the document (matching the RLS policy: owner_id = auth.uid()).
    This prevents any authenticated user from fetching arbitrary storage
    paths with service-role credentials.

    Returns a session_id that identifies this editing session.
    """
    settings = get_settings()
    if not settings.onlyoffice_jwt_secret:
        raise HTTPException(503, "OnlyOffice is not configured")

    # Step 1: Look up the document row and verify ownership
    sb = get_supabase_admin()
    result = (
        sb.table("documents_v2")
        .select("source_uid, source_locator, doc_title, owner_id")
        .eq("source_uid", req.source_uid)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Document not found")

    doc_row = result.data[0]

    # Authorization: owner_id must match the authenticated user
    # (mirrors the RLS policy on documents_v2)
    if doc_row["owner_id"] != _auth.subject_id:
        logger.warning(
            f"User {_auth.subject_id} attempted to open document "
            f"{req.source_uid} owned by {doc_row['owner_id']}"
        )
        raise HTTPException(403, "Access denied")

    source_locator = doc_row.get("source_locator")
    if not source_locator:
        raise HTTPException(404, "Document has no storage locator")

    filename = (doc_row.get("doc_title") or "document.docx").split("/")[-1]

    # Step 2: Download from Supabase Storage using infra helper
    storage_key = source_locator.lstrip("/")
    try:
        content = await download_from_storage(
            settings.supabase_url,
            settings.supabase_service_role_key,
            DOCUMENTS_BUCKET,
            storage_key,
        )
    except Exception as e:
        logger.error(f"Failed to download {storage_key} from Supabase Storage: {e}")
        raise HTTPException(502, f"Failed to fetch file from storage: {e}")

    # Step 3: Write to local cache (store owner_id for session binding)
    session_id = uuid.uuid4().hex[:12]
    _session_doc_path(session_id).write_bytes(content)
    _write_session(session_id, {
        "session_id": session_id,
        "owner_id": _auth.subject_id,
        "source_uid": req.source_uid,
        "source_locator": source_locator,
        "filename": filename,
        "content_hash": _content_hash(content),
        "size": len(content),
    })
    logger.info(f"Opened {filename} (source_uid={req.source_uid}) as session {session_id}")

    return {"session_id": session_id, "filename": filename}


# ---------------------------------------------------------------------------
# 2. Config — generate JWT-signed editor config
# ---------------------------------------------------------------------------

class ConfigRequest(BaseModel):
    session_id: str
    mode: str = "edit"  # "edit" or "view"


@router.post("/config")
async def generate_config(
    req: ConfigRequest,
    _auth: AuthPrincipal = Depends(require_auth),
):
    """Generate a JWT-signed OnlyOffice editor config for an open session.

    Session ownership is enforced: the caller must be the user who opened
    the session. This prevents a leaked or guessed session_id from granting
    access to another user's editing session.
    """
    session = _read_session(req.session_id)

    # Enforce session ownership (Critical fix: authorization on every browser-facing route)
    if session.get("owner_id") != _auth.subject_id:
        raise HTTPException(403, "You do not own this editing session")

    path = _session_doc_path(req.session_id)
    if not path.is_file():
        raise HTTPException(404, f"Session file not found for {req.session_id}")

    settings = get_settings()
    bridge_url = settings.onlyoffice_bridge_url

    # Per-session signed token for container-facing routes (replaces static callback secret)
    session_token = _sign_session_token(req.session_id)

    doc_key = f"{req.session_id}_{session.get('content_hash', 'initial')}"

    config = {
        "document": {
            "fileType": "docx",
            "key": doc_key,
            "title": session.get("filename", "document.docx"),
            "url": f"{bridge_url}/onlyoffice/doc/{req.session_id}?token={session_token}",
        },
        "editorConfig": {
            "mode": req.mode,
            "callbackUrl": f"{bridge_url}/onlyoffice/callback/{req.session_id}?token={session_token}",
            "lang": "en",
            "customization": {
                "autosave": True,
                "forcesave": True,
                "chat": False,
                "comments": True,
                "compactHeader": True,
                "compactToolbar": False,
                "help": False,
                "hideRightMenu": False,
                "toolbarNoTabs": False,
            },
        },
        "height": "100%",
        "width": "100%",
        "type": "desktop",
    }

    token = _sign_config(config)
    config["token"] = token

    return config


# ---------------------------------------------------------------------------
# 3. Serve cached file to OnlyOffice container (callback token auth)
# ---------------------------------------------------------------------------

@router.get("/doc/{session_id}")
async def serve_document(session_id: str, token: str = Query(...)):
    """Serve a cached file. Called by the OnlyOffice Document Server."""
    _verify_session_token(session_id, token)
    path = _session_doc_path(session_id)
    if not path.is_file():
        raise HTTPException(404, f"Session {session_id} not found")
    session = _read_session(session_id)
    return FileResponse(
        path,
        media_type=DOCX_CONTENT_TYPE,
        filename=session.get("filename", f"{session_id}.docx"),
    )


# ---------------------------------------------------------------------------
# 4. Save callback — download modified file, write back to Supabase Storage
# ---------------------------------------------------------------------------

@router.post("/callback/{session_id}")
async def save_callback(session_id: str, request: Request, token: str = Query(...)):
    """Handle save callbacks from the OnlyOffice Document Server.

    On status 2 or 6 (ready for saving / force-save):
    1. Downloads the modified file from the Document Server (via infra/http_client)
    2. Optimistic concurrency check: verifies the storage file hasn't changed
       since the session was opened (using content_hash)
    3. Updates the local cache
    4. Writes the modified file back to Supabase Storage (via infra/storage upsert)
    """
    _verify_session_token(session_id, token)
    settings = get_settings()

    body = await request.json()
    status = body.get("status")
    logger.info(f"Callback for session {session_id}: status={status}")

    if status in (2, 6):
        download_url = body.get("url")
        if not download_url:
            logger.error(f"No download URL in callback for {session_id}")
            return {"error": 1}

        # SSRF protection: constrain download URL to the Document Server host.
        # Uses onlyoffice_docserver_internal_url because the container may use
        # a different hostname (e.g., Docker service name) than the browser-facing URL.
        internal_url = settings.onlyoffice_docserver_internal_url or settings.onlyoffice_docserver_url
        docserver_host = urlparse(internal_url).hostname
        parsed_download = urlparse(download_url)

        if parsed_download.scheme not in {"http", "https"}:
            logger.error(f"Blocked download with invalid scheme: {parsed_download.scheme}")
            return {"error": 1}

        if parsed_download.hostname != docserver_host:
            logger.error(f"Blocked download from untrusted host: {parsed_download.hostname} (expected {docserver_host})")
            return {"error": 1}

        try:
            session = _read_session(session_id)

            # Optimistic concurrency check: verify the source file in Supabase
            # Storage hasn't been modified since this session was opened.
            # This prevents silent last-write-wins when two editors or an
            # editor + upload modify the same file concurrently.
            storage_key = session["source_locator"].lstrip("/")
            try:
                current_content = await download_from_storage(
                    settings.supabase_url,
                    settings.supabase_service_role_key,
                    DOCUMENTS_BUCKET,
                    storage_key,
                )
                current_hash = _content_hash(current_content)
                expected_hash = session.get("content_hash")
                if expected_hash and current_hash != expected_hash:
                    logger.warning(
                        f"Conflict for session {session_id}: storage hash {current_hash} "
                        f"!= session hash {expected_hash}. File was modified externally."
                    )
                    # Return error 1 to signal save failure to OnlyOffice.
                    # The user will see a save error in the editor UI.
                    return {"error": 1}
            except Exception as e:
                # If we can't read the current file (deleted?), log but proceed
                logger.warning(f"Could not verify concurrency for {session_id}: {e}")

            # Download modified file from OnlyOffice using infra helper
            new_content = await download_bytes(download_url)

            # Update local cache
            _session_doc_path(session_id).write_bytes(new_content)

            session["content_hash"] = _content_hash(new_content)
            session["size"] = len(new_content)
            _write_session(session_id, session)

            # Write back to Supabase Storage at original locator (upsert overwrites)
            await upsert_to_storage(
                settings.supabase_url,
                settings.supabase_service_role_key,
                DOCUMENTS_BUCKET,
                storage_key,
                new_content,
                DOCX_CONTENT_TYPE,
            )
            logger.info(f"Saved session {session_id} back to Supabase Storage: {storage_key} ({len(new_content)} bytes)")

        except Exception as e:
            logger.error(f"Failed to save session {session_id}: {e}")
            return {"error": 1}

    return {"error": 0}
```

**Step 2: Commit**

```bash
git add services/platform-api/app/api/routes/onlyoffice.py
git commit -m "feat: onlyoffice bridge — supabase storage shuttle with JWT config and save callback"
```

---

### Task 1.4: Mount the bridge router in main.py

**Files:**
- Modify: `services/platform-api/app/main.py`

**Step 1: Add the router**

Insert after the functions router mount (around line 73), before the plugin catch-all:

```python
    # 6. OnlyOffice bridge
    from app.api.routes.onlyoffice import router as onlyoffice_router
    app.include_router(onlyoffice_router)
```

Update the plugin catch-all comment from `6` to `7`.

**Step 2: Verify**

```bash
cd services/platform-api && uvicorn app.main:app --port 8000 --reload
curl -s http://localhost:8000/openapi.json | python3 -c "import sys,json; paths=json.load(sys.stdin)['paths']; print([p for p in paths if 'onlyoffice' in p])"
# Expected: ['/onlyoffice/open', '/onlyoffice/config', '/onlyoffice/doc/{session_id}', '/onlyoffice/callback/{session_id}']
```

**Step 3: Commit**

```bash
git add services/platform-api/app/main.py
git commit -m "feat: mount onlyoffice bridge router in platform-api"
```

---

## Phase 2 — Frontend Integration

### Task 2.1: Add Vite dev proxy for OnlyOffice API

**Files:**
- Modify: `web/vite.config.ts`

**Step 1: Add proxy rule inside the `server` block**

Add a `proxy` property after `fs`:

```ts
    proxy: {
      '/oo-api': {
        target: 'http://localhost:9980',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/oo-api/, ''),
      },
    },
```

This lets the frontend load the OnlyOffice JS API from `/oo-api/web-apps/apps/api/documents/api.js` without CORS issues during development. Bridge calls to platform-api go directly via `VITE_PIPELINE_WORKER_URL` — no proxy needed since platform-api has `allow_origins=["*"]`.

**Step 2: Commit**

```bash
git add web/vite.config.ts
git commit -m "config: vite dev proxy for onlyoffice JS API"
```

---

### Task 2.2: Add OnlyOffice API type declarations

**Files:**
- Create: `web/src/types/onlyoffice.d.ts`

**Step 1: Write ambient type declaration**

```ts
// web/src/types/onlyoffice.d.ts

/** Ambient type declarations for the OnlyOffice Document Server JS API. */

declare namespace DocsAPI {
  class DocEditor {
    constructor(containerId: string, config: DocEditorConfig);
    destroyEditor(): void;
  }

  interface DocEditorConfig {
    document: {
      fileType: string;
      key: string;
      title: string;
      url: string;
    };
    editorConfig: {
      mode: string;
      callbackUrl: string;
      lang?: string;
      customization?: Record<string, unknown>;
    };
    token?: string;
    height?: string;
    width?: string;
    type?: string;
    events?: {
      onReady?: () => void;
      onDocumentStateChange?: (event: { data: boolean }) => void;
      onError?: (event: { data: { errorCode: number; errorDescription: string } }) => void;
      onAppReady?: () => void;
    };
  }
}
```

**Step 2: Commit**

```bash
git add web/src/types/onlyoffice.d.ts
git commit -m "types: ambient declarations for OnlyOffice DocsAPI"
```

---

### Task 2.3: Extract shared `platformApiFetch` helper

The codebase has duplicate token-acquisition and platform-api fetch patterns in `services-panel.api.ts` and the old pilot. Extract a shared helper so the OnlyOffice hook (and `services-panel.api.ts`) can consume it instead of rolling their own.

**Files:**
- Create: `web/src/lib/platformApi.ts`

**Step 1: Write the shared helper**

```ts
// web/src/lib/platformApi.ts
/**
 * Shared authenticated fetch for platform-api (VITE_PIPELINE_WORKER_URL).
 *
 * Reuses requireAccessToken() from lib/edge.ts — the same token helper
 * that edgeFetch uses for Supabase Edge Functions. This module targets
 * the platform-api base URL instead.
 */
import { supabase } from '@/lib/supabase';

const PLATFORM_API_URL = (
  import.meta.env.VITE_PIPELINE_WORKER_URL ?? 'http://localhost:8000'
).replace(/\/+$/, '');

async function requireAccessToken(): Promise<string> {
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw new Error(sessionResult.error.message);

  let token = sessionResult.data.session?.access_token ?? null;
  if (!token) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) throw new Error(refreshed.error.message);
    token = refreshed.data.session?.access_token ?? null;
  }

  if (!token) throw new Error('Not authenticated');
  return token;
}

/**
 * Authenticated fetch against platform-api. Automatically attaches
 * the Supabase JWT as a Bearer token.
 */
export async function platformApiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await requireAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${PLATFORM_API_URL}${path}`, { ...init, headers });
}
```

> **Follow-up (out of scope):** `services-panel.api.ts` should be updated to import `platformApiFetch` from this module and drop its local `pipelineFetch` copy. That's a separate cleanup PR.

**Step 2: Commit**

```bash
git add web/src/lib/platformApi.ts
git commit -m "feat: shared platformApiFetch helper for platform-api calls"
```

---

### Task 2.4: Extract shared `useExternalScript` hook

The codebase has no script-loading utility. Extract a reusable hook so the OnlyOffice integration (and future external scripts) don't use module-level singletons.

**Files:**
- Create: `web/src/hooks/useExternalScript.ts`

**Step 1: Write the hook**

```ts
// web/src/hooks/useExternalScript.ts
import { useEffect, useState } from 'react';

type ScriptStatus = 'idle' | 'loading' | 'ready' | 'error';

const cache = new Map<string, Promise<void>>();

/**
 * Load an external script tag by URL. Returns its loading status.
 * Deduplicates across multiple consumers of the same URL.
 */
export function useExternalScript(src: string | null): ScriptStatus {
  const [status, setStatus] = useState<ScriptStatus>(() => {
    if (!src) return 'idle';
    return cache.has(src) ? 'ready' : 'idle';
  });

  useEffect(() => {
    if (!src) {
      setStatus('idle');
      return;
    }

    if (cache.has(src)) {
      cache.get(src)!.then(() => setStatus('ready')).catch(() => setStatus('error'));
      return;
    }

    setStatus('loading');

    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });

    cache.set(src, promise);
    promise.then(() => setStatus('ready')).catch(() => setStatus('error'));
  }, [src]);

  return status;
}
```

**Step 2: Commit**

```bash
git add web/src/hooks/useExternalScript.ts
git commit -m "feat: useExternalScript hook — reusable external script loader"
```

---

### Task 2.5: Create the `useOnlyOfficeEditor` hook

This hook encapsulates the OnlyOffice lifecycle: session opening, config fetching, editor mounting/destroying. It consumes the shared `platformApiFetch` and `useExternalScript` utilities.

**Files:**
- Create: `web/src/hooks/useOnlyOfficeEditor.ts`

**Step 1: Write the hook**

```ts
// web/src/hooks/useOnlyOfficeEditor.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { platformApiFetch } from '@/lib/platformApi';
import { useExternalScript } from '@/hooks/useExternalScript';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OnlyOfficeEditorState =
  | { status: 'idle' }
  | { status: 'opening' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

type SessionInfo = {
  sessionId: string;
  filename: string;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const OO_API_SCRIPT = '/oo-api/web-apps/apps/api/documents/api.js';

export function useOnlyOfficeEditor(
  containerId: string,
  doc: { source_uid: string } | null,
  active: boolean,
) {
  const scriptStatus = useExternalScript(active ? OO_API_SCRIPT : null);
  const [state, setState] = useState<OnlyOfficeEditorState>({ status: 'idle' });
  const editorRef = useRef<DocsAPI.DocEditor | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  const activeDocRef = useRef<string | null>(null);

  const destroy = useCallback(() => {
    editorRef.current?.destroyEditor();
    editorRef.current = null;
    sessionRef.current = null;
    activeDocRef.current = null;
  }, []);

  useEffect(() => {
    if (!active || !doc || scriptStatus !== 'ready') {
      if (!active || !doc) {
        destroy();
        setState({ status: 'idle' });
      }
      if (scriptStatus === 'error') {
        setState({ status: 'error', message: 'Failed to load OnlyOffice API script' });
      }
      return;
    }

    // Don't re-open if same doc is already active
    if (activeDocRef.current === doc.source_uid && editorRef.current) {
      return;
    }

    let cancelled = false;

    const mount = async () => {
      destroy();
      setState({ status: 'opening' });

      try {
        // 1. Open session — bridge looks up doc, verifies ownership, pulls from storage
        const openRes = await platformApiFetch('/onlyoffice/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_uid: doc.source_uid }),
        });
        if (!openRes.ok) throw new Error(await openRes.text());
        const { session_id, filename } = await openRes.json();
        if (cancelled) return;

        sessionRef.current = { sessionId: session_id, filename };

        // 2. Get signed editor config
        const configRes = await platformApiFetch('/onlyoffice/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id }),
        });
        if (!configRes.ok) throw new Error(await configRes.text());
        const config = await configRes.json();
        if (cancelled) return;

        // 3. Add event handlers
        config.events = {
          onAppReady: () => {
            console.log('[OnlyOffice] Editor ready');
          },
          onDocumentStateChange: (event: { data: boolean }) => {
            console.log('[OnlyOffice] Dirty:', event.data);
          },
          onError: (event: { data: { errorCode: number; errorDescription: string } }) => {
            console.error('[OnlyOffice] Error:', event.data);
            setState({ status: 'error', message: event.data.errorDescription });
          },
        };

        // 4. Mount editor
        await new Promise((r) => setTimeout(r, 0)); // ensure DOM is ready
        if (cancelled) return;

        const editor = new DocsAPI.DocEditor(containerId, config);
        editorRef.current = editor;
        activeDocRef.current = doc.source_uid;
        setState({ status: 'ready' });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to open OnlyOffice editor:', err);
        setState({ status: 'error', message });
      }
    };

    void mount();

    return () => {
      cancelled = true;
      destroy();
    };
  }, [active, doc?.source_uid, containerId, destroy, scriptStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

  return { state };
}
```

**Step 2: Commit**

```bash
git add web/src/hooks/useOnlyOfficeEditor.ts
git commit -m "feat: useOnlyOfficeEditor hook — lifecycle management for workbench integration"
```

---

### Task 2.6: Create the `OnlyOfficeEditorPanel` component

This is a thin wrapper around the hook that provides the DOM container and loading/error states.

**Files:**
- Create: `web/src/components/documents/OnlyOfficeEditorPanel.tsx`

**Step 1: Write the component**

```tsx
// web/src/components/documents/OnlyOfficeEditorPanel.tsx
import { Loader2, AlertCircle } from 'lucide-react';
import { useOnlyOfficeEditor } from '@/hooks/useOnlyOfficeEditor';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

const EDITOR_CONTAINER_ID = 'oo-editor-container';

type Props = {
  doc: ProjectDocumentRow;
};

export function OnlyOfficeEditorPanel({ doc }: Props) {
  const { state } = useOnlyOfficeEditor(
    EDITOR_CONTAINER_ID,
    { source_uid: doc.source_uid },
    true,
  );

  return (
    <div className="relative h-full w-full">
      {state.status === 'opening' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-card text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Loading editor…
        </div>
      )}

      {state.status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card text-sm text-destructive">
          <AlertCircle size={20} />
          <span>{state.message}</span>
        </div>
      )}

      <div
        id={EDITOR_CONTAINER_ID}
        className={`h-full w-full ${state.status === 'ready' ? '' : 'invisible'}`}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/documents/OnlyOfficeEditorPanel.tsx
git commit -m "feat: OnlyOfficeEditorPanel — wrapper component for workbench embedding"
```

---

### Task 2.7: Add "Edit in OnlyOffice" toggle to PreviewTabPanel

This is the key integration point. When viewing a `.docx` file, the unified preview header gets an "Edit" / "Preview" toggle button. Clicking "Edit" lazy-loads the `OnlyOfficeEditorPanel` and hides the `DocxPreview`. Clicking "Preview" destroys the editor and shows the read-only preview again.

**Files:**
- Modify: `web/src/components/documents/PreviewTabPanel.tsx`

**Step 1: Add imports at top of file**

After the existing imports, add:

```tsx
import { lazy, Suspense } from 'react';
import { IconEdit, IconEye } from '@tabler/icons-react';
```

And the lazy import for the editor panel:

```tsx
const OnlyOfficeEditorPanel = lazy(() =>
  import('@/components/documents/OnlyOfficeEditorPanel').then((m) => ({
    default: m.OnlyOfficeEditorPanel,
  })),
);
```

**Step 2: Add edit mode state and preview revision counter**

Inside the `PreviewTabPanel` component, after the existing state declarations (around line 34), add:

```tsx
  const [docxEditMode, setDocxEditMode] = useState(false);
  // Bumped when switching from edit → preview to force DocxPreview to
  // re-resolve its signed URL and refetch the (potentially modified) file.
  const [previewRevision, setPreviewRevision] = useState(0);
```

**Step 3: Reset edit mode when document changes**

Inside the existing `useEffect` that resets state when `doc` changes (the one starting at line 36), add inside the `loadPreview` function, at the top before `if (!doc)`:

```tsx
      setDocxEditMode(false);
      setPreviewRevision(0);
```

**Step 4: Modify the docx rendering block**

Replace the existing docx block (lines 362-372):

```tsx
  if (previewKind === 'docx' && previewUrl) {
    return renderPreviewWithUnifiedHeader(
      <DocxPreview
        key={`${doc.source_uid}:${previewUrl}`}
        title={doc.doc_title}
        url={previewUrl}
        hideToolbar
      />,
      { downloadUrl: previewUrl },
    );
  }
```

With:

```tsx
  if (previewKind === 'docx' && previewUrl) {
    const editToggle = (
      <button
        type="button"
        onClick={() => {
          setDocxEditMode((prev) => {
            if (prev) {
              // Switching from edit → preview: bump revision to force
              // DocxPreview to refetch the (potentially modified) file.
              setPreviewRevision((r) => r + 1);
            }
            return !prev;
          });
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {docxEditMode ? <IconEye size={14} /> : <IconEdit size={14} />}
        {docxEditMode ? 'Preview' : 'Edit'}
      </button>
    );

    if (docxEditMode && doc) {
      return renderPreviewWithUnifiedHeader(
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading editor…
            </div>
          }
        >
          <OnlyOfficeEditorPanel doc={doc} />
        </Suspense>,
        {
          downloadUrl: previewUrl,
          useScrollArea: false,
          contentClassName: 'overflow-hidden',
          headerActions: editToggle,
        },
      );
    }

    // previewRevision in the key forces DocxPreview to remount and
    // refetch the signed URL after an edit session, so the user sees
    // the updated content without a full page refresh.
    return renderPreviewWithUnifiedHeader(
      <DocxPreview
        key={`${doc.source_uid}:${previewUrl}:${previewRevision}`}
        title={doc.doc_title}
        url={previewUrl}
        hideToolbar
      />,
      {
        downloadUrl: previewUrl,
        headerActions: editToggle,
      },
    );
  }
```

**Step 5: Verify**

```bash
cd web && npm run dev
# Navigate to the ELT workbench, click a .docx file
# Expected: Preview header shows "Edit" button next to download icon
# Click "Edit" → OnlyOffice editor loads in the same tab
# Click "Preview" → read-only DocxPreview returns
```

**Step 6: Commit**

```bash
git add web/src/components/documents/PreviewTabPanel.tsx
git commit -m "feat: add Edit/Preview toggle for docx files in PreviewTabPanel — mounts OnlyOffice editor inline"
```

---

## Phase 3 — Tests & Verification

### Task 3.1: Write platform-api smoke tests

**Files:**
- Create: `services/platform-api/tests/test_onlyoffice.py`

**Step 1: Write tests**

```python
# services/platform-api/tests/test_onlyoffice.py
"""Smoke tests for the OnlyOffice bridge routes.

Mock targets match the infra modules the bridge imports:
- app.api.routes.onlyoffice.download_from_storage  (from app.infra.storage)
- app.api.routes.onlyoffice.upsert_to_storage      (from app.infra.storage)
- app.api.routes.onlyoffice.download_bytes          (from app.infra.http_client)
- app.api.routes.onlyoffice.get_supabase_admin      (from app.infra.supabase_client)
"""

import json
import os
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

# Override settings before importing app
os.environ.setdefault("ONLYOFFICE_JWT_SECRET", "test-secret")
os.environ.setdefault("ONLYOFFICE_DOCSERVER_URL", "http://docserver:9980")
os.environ.setdefault("ONLYOFFICE_DOCSERVER_INTERNAL_URL", "http://docserver:9980")
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")

from app.main import create_app

FAKE_DOCX = b"PK\x03\x04" + b"\x00" * 100
TEST_USER_ID = "test-user"

# Fake document row matching what documents_v2 would return
FAKE_DOC_ROW = {
    "source_uid": "abc123",
    "source_locator": "/uploads/abc123/test.docx",
    "doc_title": "test.docx",
    "owner_id": TEST_USER_ID,
}


@pytest.fixture
def tmp_cache(tmp_path):
    """Use a temp dir for the bridge cache."""
    with patch.dict(os.environ, {"ONLYOFFICE_STORAGE_DIR": str(tmp_path)}):
        from app.core.config import get_settings
        get_settings.cache_clear()
        yield tmp_path
    get_settings.cache_clear()


@pytest.fixture
def mock_supabase_admin():
    """Mock get_supabase_admin for document row lookup."""
    mock_execute = MagicMock()
    mock_execute.execute.return_value = MagicMock(data=[FAKE_DOC_ROW])

    mock_query = MagicMock()
    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.limit.return_value = mock_execute

    mock_client = MagicMock()
    mock_client.table.return_value = mock_query

    with patch(
        "app.api.routes.onlyoffice.get_supabase_admin",
        return_value=mock_client,
    ):
        yield mock_client


@pytest.fixture
def mock_storage_download():
    """Mock download_from_storage (infra/storage.py) as used by the bridge."""
    with patch(
        "app.api.routes.onlyoffice.download_from_storage",
        new_callable=AsyncMock,
        return_value=FAKE_DOCX,
    ) as m:
        yield m


@pytest.fixture
def mock_storage_upsert():
    """Mock upsert_to_storage (infra/storage.py) as used by the bridge."""
    with patch(
        "app.api.routes.onlyoffice.upsert_to_storage",
        new_callable=AsyncMock,
        return_value="https://example.com/storage/v1/object/public/documents/test.docx",
    ) as m:
        yield m


@pytest.fixture
def mock_download_bytes():
    """Mock download_bytes (infra/http_client.py) as used by the bridge."""
    with patch(
        "app.api.routes.onlyoffice.download_bytes",
        new_callable=AsyncMock,
    ) as m:
        yield m


@pytest.fixture
def client(tmp_cache, mock_supabase_admin, mock_storage_download, mock_storage_upsert, mock_download_bytes):
    """Test client with auth overridden and infra mocked."""
    from app.auth.dependencies import require_auth, AuthPrincipal

    app = create_app()

    principal = AuthPrincipal(
        subject_type="user",
        subject_id=TEST_USER_ID,
        roles=frozenset({"authenticated"}),
        auth_source="test",
        email="test@example.com",
    )
    app.dependency_overrides[require_auth] = lambda: principal

    yield TestClient(app)
    app.dependency_overrides.clear()


class TestOpenAndConfig:
    def test_open_returns_session_id(self, client):
        resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "session_id" in data
        assert data["filename"] == "test.docx"

    def test_open_rejects_wrong_owner(self, client, mock_supabase_admin):
        """A user cannot open a document owned by someone else."""
        other_doc = {**FAKE_DOC_ROW, "owner_id": "other-user"}
        mock_execute = MagicMock()
        mock_execute.execute.return_value = MagicMock(data=[other_doc])
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.limit.return_value = mock_execute
        mock_supabase_admin.table.return_value = mock_query

        resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        assert resp.status_code == 403

    def test_open_404_for_missing_document(self, client, mock_supabase_admin):
        mock_execute = MagicMock()
        mock_execute.execute.return_value = MagicMock(data=[])
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.limit.return_value = mock_execute
        mock_supabase_admin.table.return_value = mock_query

        resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "nonexistent"},
        )
        assert resp.status_code == 404

    def test_config_returns_signed_jwt(self, client):
        # Open first
        open_resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        session_id = open_resp.json()["session_id"]

        # Get config
        resp = client.post(
            "/onlyoffice/config",
            json={"session_id": session_id},
        )
        assert resp.status_code == 200
        config = resp.json()
        assert "token" in config
        assert config["document"]["fileType"] == "docx"
        assert session_id in config["document"]["url"]

    def test_config_404_for_missing_session(self, client):
        resp = client.post(
            "/onlyoffice/config",
            json={"session_id": "nonexistent"},
        )
        assert resp.status_code == 404

    def test_config_rejects_different_user(self, client):
        """A user cannot get config for a session opened by another user."""
        from app.auth.dependencies import require_auth, AuthPrincipal

        # Open as test-user
        open_resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        session_id = open_resp.json()["session_id"]

        # Switch to a different user
        other_principal = AuthPrincipal(
            subject_type="user",
            subject_id="other-user",
            roles=frozenset({"authenticated"}),
            auth_source="test",
            email="other@example.com",
        )
        client.app.dependency_overrides[require_auth] = lambda: other_principal

        resp = client.post(
            "/onlyoffice/config",
            json={"session_id": session_id},
        )
        assert resp.status_code == 403


class TestContainerRoutes:
    def _get_session_token(self, client, session_id: str) -> str:
        """Helper: get a per-session token via /config."""
        resp = client.post(
            "/onlyoffice/config",
            json={"session_id": session_id},
        )
        assert resp.status_code == 200
        # Extract session token from the document URL query param
        doc_url = resp.json()["document"]["url"]
        return doc_url.split("token=")[1]

    def test_doc_serve_requires_valid_session_token(self, client):
        open_resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        session_id = open_resp.json()["session_id"]
        session_token = self._get_session_token(client, session_id)

        # Wrong token
        resp = client.get(f"/onlyoffice/doc/{session_id}?token=wrong")
        assert resp.status_code == 401

        # Correct per-session token
        resp = client.get(f"/onlyoffice/doc/{session_id}?token={session_token}")
        assert resp.status_code == 200

    def test_session_token_scoped_to_session(self, client, mock_supabase_admin):
        """A session token for session A cannot be used on session B."""
        open_a = client.post("/onlyoffice/open", json={"source_uid": "abc123"})
        session_a = open_a.json()["session_id"]
        token_a = self._get_session_token(client, session_a)

        open_b = client.post("/onlyoffice/open", json={"source_uid": "abc123"})
        session_b = open_b.json()["session_id"]

        # Token A should not work for session B
        resp = client.get(f"/onlyoffice/doc/{session_b}?token={token_a}")
        assert resp.status_code == 401

    def test_callback_writes_back_to_supabase(self, client, mock_download_bytes, mock_storage_download, mock_storage_upsert):
        open_resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        session_id = open_resp.json()["session_id"]
        session_token = self._get_session_token(client, session_id)

        new_content = b"PK\x03\x04" + b"\xff" * 200
        mock_download_bytes.return_value = new_content
        # Concurrency check: storage still has the original content
        mock_storage_download.return_value = FAKE_DOCX

        resp = client.post(
            f"/onlyoffice/callback/{session_id}?token={session_token}",
            json={
                "status": 2,
                "url": "http://docserver:9980/cache/files/output.docx",
            },
        )

        assert resp.status_code == 200
        assert resp.json() == {"error": 0}

        # Verify download_bytes was called with the OnlyOffice download URL
        mock_download_bytes.assert_called_once_with(
            "http://docserver:9980/cache/files/output.docx"
        )

        # Verify upsert_to_storage was called with correct args
        mock_storage_upsert.assert_called_once()
        call_args = mock_storage_upsert.call_args
        # Positional: (supabase_url, supabase_key, bucket, path, content, content_type)
        assert call_args[0][2] == "documents"
        assert call_args[0][3] == "uploads/abc123/test.docx"
        assert call_args[0][4] == new_content

    def test_callback_rejects_wrong_host(self, client):
        open_resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        session_id = open_resp.json()["session_id"]
        session_token = self._get_session_token(client, session_id)

        resp = client.post(
            f"/onlyoffice/callback/{session_id}?token={session_token}",
            json={
                "status": 2,
                "url": "http://evil.example.com/malicious.docx",
            },
        )
        assert resp.status_code == 200
        assert resp.json() == {"error": 1}

    def test_callback_rejects_on_concurrency_conflict(self, client, mock_storage_download):
        """If the file in storage changed since session open, save is rejected."""
        open_resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        session_id = open_resp.json()["session_id"]
        session_token = self._get_session_token(client, session_id)

        # Storage now returns different content (someone else modified it)
        mock_storage_download.return_value = b"PK\x03\x04" + b"\xAA" * 100

        resp = client.post(
            f"/onlyoffice/callback/{session_id}?token={session_token}",
            json={
                "status": 2,
                "url": "http://docserver:9980/cache/files/output.docx",
            },
        )
        assert resp.status_code == 200
        assert resp.json() == {"error": 1}  # Conflict — save rejected
```

**Step 2: Run tests**

```bash
cd services/platform-api && python -m pytest tests/test_onlyoffice.py -v
# Expected: All tests pass
```

**Step 3: Commit**

```bash
git add services/platform-api/tests/test_onlyoffice.py
git commit -m "test: smoke tests for onlyoffice bridge (open, config, serve, callback, SSRF rejection, Supabase writeback)"
```

---

### Task 3.2: Manual end-to-end verification

**Prerequisites running:**
1. OnlyOffice Document Server: `cd services/onlyoffice && docker compose up -d`
2. Platform-API: `cd services/platform-api && ONLYOFFICE_STORAGE_DIR=./cache/onlyoffice uvicorn app.main:app --port 8000 --reload`
3. Web dev server: `cd web && npm run dev`

**Test sequence:**

1. Navigate to the ELT workbench with a project that has a `.docx` file
2. Click the `.docx` in the assets panel
3. Verify: `DocxPreview` renders with an "Edit" button in the header
4. Click "Edit":
   - Browser calls `POST /onlyoffice/open` with the `source_uid`
   - Bridge pulls the file from Supabase Storage into local cache
   - Browser calls `POST /onlyoffice/config` to get signed editor config
   - OnlyOffice editor iframe mounts, replacing the preview
   - Header button changes to "Preview"
5. Edit the document in the OnlyOffice editor
6. Wait for autosave (or close tab to trigger force-save):
   - OnlyOffice container calls `POST /onlyoffice/callback/{session_id}?token=...` with status=2
   - Bridge downloads modified file from container
   - Bridge writes modified file back to Supabase Storage at the original locator
   - Check platform-api logs for: `Saved session ... back to Supabase Storage`
7. Click "Preview" — editor destroys, `DocxPreview` renders the updated file
8. Verify the updated content persists by refreshing the page and previewing again

**Common failure points:**

| Symptom | Cause | Fix |
|---|---|---|
| "Failed to load OnlyOffice API script" | Document Server not running | `curl http://localhost:9980/healthcheck` |
| "Failed to fetch file from storage" | Supabase URL/key not configured in platform-api | Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars |
| Editor shows "Download failed" | Container can't reach platform-api | Check `ONLYOFFICE_BRIDGE_URL` and `docker compose exec documentserver curl http://host.docker.internal:8000/health` |
| Save callback fails with "Blocked download from untrusted host" | `ONLYOFFICE_DOCSERVER_URL` hostname doesn't match download URL | Ensure `ONLYOFFICE_DOCSERVER_URL` matches the container's actual hostname |
| Preview doesn't update after edit | Signed URL cached or stale | `resolveSignedUrlForLocators` generates fresh signed URLs; check that the Supabase Storage `update` call succeeded |

---

## Dependency Map

```
Phase 0 (docker networking + pip deps)
  └─ Phase 1 (upsert_to_storage helper + bridge with server-side authz + mount router)
       └─ Phase 2 (vite proxy + types + shared platformApiFetch + useExternalScript + hook + panel + toggle)
            └─ Phase 3 (smoke tests incl. ownership rejection + manual e2e)
```

All phases are sequential.

---

## What This Plan Does NOT Include (Deferred)

- **Standalone pilot page** — Not needed. The integration point is `PreviewTabPanel`.
- **Separate upload flow** — Files go through the existing ingest pipeline.
- **Editor registry integration** — The superuser workspace editor registry (`editorRegistry.ts`) is a separate concern. This plan integrates at the workbench/preview level.
- **Tab registry integration** — The edit toggle lives within the existing preview tab. No new tab type needed.
- **XLSX/PPTX** — Same pattern, different `fileType` and MIME types. Trivial to add later.
- **Collaboration / user identity** — OnlyOffice supports co-editing but the editor config doesn't include user info yet.
- **Cache cleanup** — The local cache grows; a cron or TTL-based cleanup is needed for production.
- **Production networking** — HTTPS, reverse proxy for OnlyOffice JS API, secrets management.