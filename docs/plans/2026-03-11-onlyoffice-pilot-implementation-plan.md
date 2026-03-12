# OnlyOffice DOCX Pilot — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stand up a self-contained OnlyOffice pilot page at `/app/superuser/onlyoffice` that renders and edits DOCX files via the already-running OnlyOffice Document Server (localhost:9980), backed by a thin platform-api bridge with server-side document storage.

**Architecture:** OnlyOffice is a server-native editor — it fetches documents from a URL and saves via server callback. Documents live on the server permanently (Docker volume mounted into platform-api). The browser never handles raw file bytes during editing. The pilot uses a dedicated bridge in platform-api (`/onlyoffice/*`) that manages documents in a persistent storage directory, serves them to the Document Server container, receives save callbacks, and generates JWT-signed editor configs. The React page loads the OnlyOffice JS API, requests a signed config from platform-api, and mounts the editor in an iframe container.

**Storage model:** Two modes share the same OnlyOffice pipeline — only the edges differ:

| | Team/Online mode (this pilot) | Local mode (future) |
|---|---|---|
| Source of truth | Server storage (Docker volume) | User's local filesystem |
| On open | OnlyOffice loads directly from server | Browser uploads via File System Access API, then OnlyOffice loads |
| During edit | Same — OnlyOffice edits on server | Same |
| On save | Saved to server, done | Saved to server, then browser downloads and writes back to local file |
| Collaboration | Multiple users can edit same doc | Single user |

The pilot builds team mode first. Local mode layers on top later with a File System Access API shuttle. The OnlyOffice integration itself is identical in both cases.

**Tech Stack:** React 19, FastAPI (platform-api), PyJWT, python-multipart, OnlyOffice Document Server (Docker, Community Edition), Vite dev proxy

**Auth model:** The bridge has two trust boundaries:
- **Browser-facing routes** (`POST /onlyoffice/upload`, `GET /onlyoffice/documents`, `POST /onlyoffice/config`) — require `Depends(require_superuser)`, matching the existing pattern in `admin_services.py`. The frontend sends a Supabase JWT `Authorization: Bearer` header using the same `requireAccessToken()` helper from `lib/edge.ts`.
- **Container-facing routes** (`GET /onlyoffice/doc/{doc_id}`, `POST /onlyoffice/callback/{doc_id}`) — called by the OnlyOffice Document Server, which has no Supabase JWT. These are authenticated via an `ONLYOFFICE_CALLBACK_TOKEN` shared secret sent as a query parameter (`?token=...`). The URLs embedded in the signed editor config include this token automatically.

**Accepted risk (pilot scope):** The callback token is embedded in the editor config returned to authenticated superusers. A superuser could extract and reuse the token to call container-facing routes directly. This is acceptable for the pilot because (a) superusers are already fully trusted, and (b) the token only grants access to documents they can already see. For production, the token should be rotated or replaced with a per-session mechanism. Additionally, the callback handler constrains download URLs to the `ONLYOFFICE_DOCSERVER_URL` host to prevent SSRF via crafted callback payloads.

**Networking:** The OnlyOffice Document Server must be able to reach platform-api over HTTP. This is topology-dependent:
- **Local dev (container → host):** `extra_hosts: host.docker.internal:host-gateway` in docker-compose, URLs use `http://host.docker.internal:8000`
- **Docker network (container → container):** Both services on the same network, URLs use Docker service names
- **External/managed server:** URLs use the public or internal hostname

The bridge abstracts this via two env vars — no topology is hardcoded in the application code:
- `ONLYOFFICE_BRIDGE_URL` — the base URL the Document Server uses to reach platform-api (used to build `document.url` and `callbackUrl` in the editor config)
- `ONLYOFFICE_DOCSERVER_URL` — the base URL of the OnlyOffice Document Server itself (used to validate that download URLs in save callbacks actually originate from the expected server)

---

## Phase 0 — Docker Networking & Dependencies

### Task 0.1: Dev-only preflight — verify OnlyOffice can reach platform-api

> This task is specific to local development where the Document Server runs in Docker and platform-api runs on the host. Other topologies (shared Docker network, external server) skip this task and configure `ONLYOFFICE_BRIDGE_URL` instead.

**Files:**
- Verify: `services/onlyoffice/docker-compose.yml` (should already have `extra_hosts`)

**Step 1: Confirm extra_hosts is set on the documentserver service**

```yaml
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

This should already be present. If not, add it and recreate the container.

**Step 2: Restart the stack if changes were made**

```bash
cd services/onlyoffice && docker compose down && docker compose up -d
```

**Step 3: Verify host access from inside the container**

```bash
# Wait for healthy status, then test connectivity
docker compose exec documentserver curl -s http://host.docker.internal:8000/health
# Expected: {"status":"ok","functions":...}
```

If platform-api isn't running locally, start it first:
```bash
cd services/platform-api && uvicorn app.main:app --port 8000
```

---

### Task 0.2: Add PyJWT and python-multipart to platform-api dependencies

**Files:**
- Modify: `services/platform-api/requirements.txt`

**Step 1: Add both dependencies**

Append to requirements.txt:
```
PyJWT>=2.8
python-multipart>=0.0.9
```

`PyJWT` is for signing OnlyOffice editor configs. `python-multipart` is required by FastAPI for `UploadFile` / `File(...)` form-data parsing — without it, the upload endpoint will raise a runtime error.

**Step 2: Install**

```bash
cd services/platform-api && pip install -r requirements.txt
```

**Step 3: Commit**

```bash
git add services/platform-api/requirements.txt
git commit -m "deps: add PyJWT and python-multipart for onlyoffice bridge"
```

---

## Phase 1 — Platform-API Bridge

### Task 1.1: Add OnlyOffice settings to config

**Files:**
- Modify: `services/platform-api/app/core/config.py`

**Step 1: Add OnlyOffice fields to Settings**

Add five new fields to the `Settings` dataclass and load them in `from_env()`:

- `onlyoffice_jwt_secret` — must match the `JWT_SECRET` in the OnlyOffice docker-compose
- `onlyoffice_storage_dir` — persistent directory for server-side documents
- `onlyoffice_callback_token` — shared secret for authenticating container-facing routes (doc serve + callback)
- `onlyoffice_bridge_url` — base URL the Document Server uses to reach platform-api (topology-dependent)
- `onlyoffice_docserver_url` — base URL of the OnlyOffice Document Server itself (used to validate callback download URLs)

```python
    onlyoffice_jwt_secret: str = ""
    onlyoffice_storage_dir: str = ""
    onlyoffice_callback_token: str = ""
    onlyoffice_bridge_url: str = ""
    onlyoffice_docserver_url: str = ""
```

In `from_env()`:

```python
    onlyoffice_jwt_secret=os.environ.get("ONLYOFFICE_JWT_SECRET", "my-jwt-secret-change-me"),
    onlyoffice_storage_dir=os.environ.get("ONLYOFFICE_STORAGE_DIR", "/app/storage/onlyoffice"),
    onlyoffice_callback_token=os.environ.get("ONLYOFFICE_CALLBACK_TOKEN", "oo-callback-secret-change-me"),
    onlyoffice_bridge_url=os.environ.get("ONLYOFFICE_BRIDGE_URL", "http://host.docker.internal:8000"),
    onlyoffice_docserver_url=os.environ.get("ONLYOFFICE_DOCSERVER_URL", "http://localhost:9980"),
```

**Step 2: Commit**

```bash
git add services/platform-api/app/core/config.py
git commit -m "config: add onlyoffice JWT secret and storage directory settings"
```

---

### Task 1.2: Create the OnlyOffice bridge router

**Files:**
- Create: `services/platform-api/app/api/routes/onlyoffice.py`

This router provides five endpoints. Documents are stored persistently in the storage directory — they are the source of truth, not transient staging.

**Endpoints:**

| Endpoint | Purpose | Called by |
|---|---|---|
| `POST /onlyoffice/upload` | Upload a .docx, store permanently, return `doc_id` | Browser |
| `GET /onlyoffice/documents` | List all stored documents | Browser |
| `POST /onlyoffice/config` | Generate JWT-signed editor config | Browser |
| `GET /onlyoffice/doc/{doc_id}` | Serve the .docx file | OnlyOffice container |
| `POST /onlyoffice/callback/{doc_id}` | Receive save callback, download modified file, write to storage | OnlyOffice container |

**Step 1: Write the router**

```python
# services/platform-api/app/api/routes/onlyoffice.py
"""OnlyOffice Document Server bridge.

Server-side document storage with JWT-signed editor configs
and save callbacks from the Document Server container.

Auth model:
- Browser-facing routes: Depends(require_superuser) — Supabase JWT
- Container-facing routes: ONLYOFFICE_CALLBACK_TOKEN query param
"""

import hashlib
import json
import logging
import uuid
from pathlib import Path

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.auth.dependencies import require_superuser, AuthPrincipal
from app.core.config import get_settings

logger = logging.getLogger("platform-api.onlyoffice")

router = APIRouter(prefix="/onlyoffice", tags=["onlyoffice"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _storage_dir() -> Path:
    d = Path(get_settings().onlyoffice_storage_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _meta_path(doc_id: str) -> Path:
    return _storage_dir() / f"{doc_id}.meta.json"


def _doc_path(doc_id: str) -> Path:
    return _storage_dir() / f"{doc_id}.docx"


def _read_meta(doc_id: str) -> dict:
    mp = _meta_path(doc_id)
    if not mp.is_file():
        raise HTTPException(404, f"Document {doc_id} not found")
    return json.loads(mp.read_text())


def _write_meta(doc_id: str, meta: dict) -> None:
    _meta_path(doc_id).write_text(json.dumps(meta))


def _content_hash(data: bytes) -> str:
    """SHA-256 hex digest of file content — used as part of the document key."""
    return hashlib.sha256(data).hexdigest()[:16]


def _sign_config(payload: dict) -> str:
    secret = get_settings().onlyoffice_jwt_secret
    if not secret:
        raise HTTPException(500, "ONLYOFFICE_JWT_SECRET not configured")
    return jwt.encode(payload, secret, algorithm="HS256")


def _verify_callback_token(token: str) -> None:
    """Verify the shared secret for container-facing routes."""
    expected = get_settings().onlyoffice_callback_token
    if not expected:
        raise HTTPException(500, "ONLYOFFICE_CALLBACK_TOKEN not configured")
    if token != expected:
        raise HTTPException(401, "Invalid callback token")


# ---------------------------------------------------------------------------
# 1. Upload a DOCX to server-side storage (browser, superuser auth)
# ---------------------------------------------------------------------------

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    _su: AuthPrincipal = Depends(require_superuser),
):
    """Upload a DOCX file for permanent server-side storage."""
    if not file.filename or not file.filename.lower().endswith(".docx"):
        raise HTTPException(400, "Only .docx files are supported")

    doc_id = uuid.uuid4().hex[:12]
    content = await file.read()
    _doc_path(doc_id).write_bytes(content)
    _write_meta(doc_id, {
        "doc_id": doc_id,
        "filename": file.filename,
        "size": len(content),
        "content_hash": _content_hash(content),
    })
    logger.info(f"Stored {file.filename} as {doc_id}: {len(content)} bytes")

    return {"doc_id": doc_id, "filename": file.filename}


# ---------------------------------------------------------------------------
# 2. List all stored documents (browser, superuser auth)
# ---------------------------------------------------------------------------

@router.get("/documents")
async def list_documents(
    _su: AuthPrincipal = Depends(require_superuser),
):
    """List all documents in server-side storage."""
    docs = []
    for meta_file in sorted(_storage_dir().glob("*.meta.json")):
        meta = json.loads(meta_file.read_text())
        docs.append(meta)
    return docs


# ---------------------------------------------------------------------------
# 3. Serve document to OnlyOffice container (callback token auth)
# ---------------------------------------------------------------------------

@router.get("/doc/{doc_id}")
async def serve_document(doc_id: str, token: str = Query(...)):
    """Serve a stored DOCX file. Called by the OnlyOffice Document Server."""
    _verify_callback_token(token)
    path = _doc_path(doc_id)
    if not path.is_file():
        raise HTTPException(404, f"Document {doc_id} not found")
    meta = _read_meta(doc_id)
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=meta.get("filename", f"{doc_id}.docx"),
    )


# ---------------------------------------------------------------------------
# 4. Save callback from OnlyOffice container (callback token auth)
# ---------------------------------------------------------------------------

@router.post("/callback/{doc_id}")
async def save_callback(doc_id: str, request: Request, token: str = Query(...)):
    """Handle save callbacks from the OnlyOffice Document Server.

    Status codes from OnlyOffice:
      0 — no changes
      1 — editing in progress
      2 — ready for saving (document closed or force-save)
      3 — saving error
      4 — closed without changes
      6 — force-save while editing
      7 — force-save error
    """
    _verify_callback_token(token)
    settings = get_settings()

    body = await request.json()
    status = body.get("status")
    logger.info(f"Callback for {doc_id}: status={status}")

    if status in (2, 6):
        download_url = body.get("url")
        if not download_url:
            logger.error(f"No download URL in callback for {doc_id}")
            return {"error": 1}

        # Constrain download URL to the OnlyOffice Document Server host
        # to prevent SSRF via crafted callback payloads.
        # ONLYOFFICE_DOCSERVER_URL is the authoritative source for what host
        # the document server's download URLs should point to.
        from urllib.parse import urlparse

        docserver_host = urlparse(settings.onlyoffice_docserver_url).hostname
        download_host = urlparse(download_url).hostname
        download_scheme = urlparse(download_url).scheme

        if download_scheme not in {"http", "https"}:
            logger.error(f"Blocked download with invalid scheme: {download_scheme}")
            return {"error": 1}

        if download_host != docserver_host:
            logger.error(f"Blocked download from untrusted host: {download_host}")
            return {"error": 1}

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(download_url)
                resp.raise_for_status()

            path = _doc_path(doc_id)
            path.write_bytes(resp.content)
            logger.info(f"Saved {doc_id}: {len(resp.content)} bytes")

            # Update size and content hash in metadata
            meta = _read_meta(doc_id)
            meta["size"] = len(resp.content)
            meta["content_hash"] = _content_hash(resp.content)
            _write_meta(doc_id, meta)
        except Exception as e:
            logger.error(f"Failed to save {doc_id}: {e}")
            return {"error": 1}

    return {"error": 0}


# ---------------------------------------------------------------------------
# 5. Generate JWT-signed editor config (browser, superuser auth)
# ---------------------------------------------------------------------------

class ConfigRequest(BaseModel):
    doc_id: str
    filename: str = "document.docx"
    mode: str = "edit"  # "edit" or "view"


@router.post("/config")
async def generate_config(
    req: ConfigRequest,
    _su: AuthPrincipal = Depends(require_superuser),
):
    """Generate a JWT-signed OnlyOffice editor config.

    The frontend calls this, then passes the result to
    `new DocsAPI.DocEditor(containerId, config)`.
    """
    path = _doc_path(req.doc_id)
    if not path.is_file():
        raise HTTPException(404, f"Document {req.doc_id} not found")

    settings = get_settings()

    # Base URL the Document Server uses to reach platform-api.
    # Configured per-topology via ONLYOFFICE_BRIDGE_URL.
    bridge_url = settings.onlyoffice_bridge_url
    cb_token = settings.onlyoffice_callback_token

    # doc_key uses content hash — changes whenever the file content changes,
    # immune to rapid same-second saves.
    meta = _read_meta(req.doc_id)
    doc_key = f"{req.doc_id}_{meta.get('content_hash', 'initial')}"

    config = {
        "document": {
            "fileType": "docx",
            "key": doc_key,
            "title": req.filename,
            "url": f"{bridge_url}/onlyoffice/doc/{req.doc_id}?token={cb_token}",
        },
        "editorConfig": {
            "mode": req.mode,
            "callbackUrl": f"{bridge_url}/onlyoffice/callback/{req.doc_id}?token={cb_token}",
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
```

**Step 2: Commit**

```bash
git add services/platform-api/app/api/routes/onlyoffice.py
git commit -m "feat: onlyoffice bridge — server-side storage, JWT config, save callback"
```

---

### Task 1.3: Mount the bridge router in main.py

**Files:**
- Modify: `services/platform-api/app/main.py`

**Step 1: Add the router**

Insert after the functions router mount (around line 71), before the plugin catch-all:

```python
    # 6. OnlyOffice bridge
    from app.api.routes.onlyoffice import router as onlyoffice_router
    app.include_router(onlyoffice_router)
```

Update the plugin catch-all comment number from `6` to `7`.

**Step 2: Verify**

```bash
cd services/platform-api && uvicorn app.main:app --port 8000 --reload
# Check Swagger docs — OnlyOffice routes should appear
curl http://localhost:8000/docs
```

**Step 3: Commit**

```bash
git add services/platform-api/app/main.py
git commit -m "feat: mount onlyoffice bridge router in platform-api"
```

---

### Task 1.4: Add storage volume to platform-api (if Dockerized)

**Files:**
- Modify: platform-api's docker-compose or run command

**Step 1: Mount a persistent volume**

If platform-api runs via docker-compose, add:

```yaml
services:
  platform-api:
    volumes:
      - ./storage:/app/storage
```

If running locally for dev (`uvicorn`), the default path `/app/storage/onlyoffice` won't exist. Set the env var:

```bash
export ONLYOFFICE_STORAGE_DIR=./storage/onlyoffice
```

Or create the directory:

```bash
mkdir -p storage/onlyoffice
```

**Step 2: Commit** (if docker-compose was modified)

```bash
git add docker-compose.yml  # or wherever platform-api compose lives
git commit -m "infra: add persistent storage volume for platform-api"
```

---

## Phase 2 — Frontend Pilot Page

### Task 2.1: Add Vite dev proxy for OnlyOffice API and bridge

**Files:**
- Modify: `web/vite.config.ts`

**Step 1: Add proxy rules to the server config**

Inside the `server` block, add a `proxy` object:

```ts
    proxy: {
      // OnlyOffice JS API and iframe resources
      '/oo-api': {
        target: 'http://localhost:9980',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/oo-api/, ''),
      },
    },
```

This lets the frontend load the OnlyOffice JS API from `/oo-api/web-apps/apps/api/documents/api.js` without CORS issues during development. Bridge calls to platform-api go directly via `VITE_PIPELINE_WORKER_URL` (default `http://localhost:8000`) with Supabase JWT auth — no proxy needed since platform-api already has `allow_origins=["*"]` in its CORS config.

**Step 2: Commit**

```bash
git add web/vite.config.ts
git commit -m "config: vite dev proxy for onlyoffice API and platform-api bridge"
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

### Task 2.3: Create the OnlyOffice pilot page component

**Files:**
- Create: `web/src/pages/superuser/OnlyOfficePilot.tsx`

This is a self-contained page with:
- **Left sidebar:** upload dropzone + server-side document list (fetched from `GET /onlyoffice/documents`)
- **Main area:** OnlyOffice editor iframe

The document list reflects what's stored permanently on the server. Any team member hitting the same page sees the same documents. Upload adds to server storage; clicking a document opens it in the editor.

**Step 1: Write the component**

```tsx
// web/src/pages/superuser/OnlyOfficePilot.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUp, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StoredDoc = {
  doc_id: string;
  filename: string;
  size: number;
};

type EditorState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; doc: StoredDoc }
  | { status: 'error'; message: string };

// ---------------------------------------------------------------------------
// Auth helper — get Supabase JWT for platform-api calls
// ---------------------------------------------------------------------------

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

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await requireAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${PLATFORM_API_URL}${path}`, { ...init, headers });
}

// ---------------------------------------------------------------------------
// Script loader — loads the OnlyOffice JS API once
// ---------------------------------------------------------------------------

const OO_API_SCRIPT = '/oo-api/web-apps/apps/api/documents/api.js';
let scriptPromise: Promise<void> | null = null;

function loadOnlyOfficeApi(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof DocsAPI !== 'undefined') {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = OO_API_SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load OnlyOffice API script'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EDITOR_CONTAINER_ID = 'oo-editor-container';

export function Component() {
  const [docs, setDocs] = useState<StoredDoc[]>([]);
  const [editorState, setEditorState] = useState<EditorState>({ status: 'idle' });
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const editorRef = useRef<DocsAPI.DocEditor | null>(null);

  // --- Load document list from server ---

  const fetchDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await authedFetch('/onlyoffice/documents');
      if (!res.ok) throw new Error(await res.text());
      const data: StoredDoc[] = await res.json();
      setDocs(data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      editorRef.current?.destroyEditor();
      editorRef.current = null;
    };
  }, []);

  // --- Upload ---

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Only .docx files are supported in this pilot.');
      return;
    }
    setUploading(true);
    try {
      const token = await requireAccessToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${PLATFORM_API_URL}/onlyoffice/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchDocs(); // Refresh list from server
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Is platform-api running on :8000?');
    } finally {
      setUploading(false);
    }
  }, [fetchDocs]);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleUpload(file);
      e.target.value = '';
    },
    [handleUpload],
  );

  // --- Open document in editor ---

  const openDocument = useCallback(async (doc: StoredDoc) => {
    // Destroy previous editor instance
    editorRef.current?.destroyEditor();
    editorRef.current = null;
    setEditorState({ status: 'loading' });

    try {
      // 1. Load the OnlyOffice JS API if not loaded yet
      await loadOnlyOfficeApi();

      // 2. Get signed config from platform-api bridge (authenticated)
      const res = await authedFetch('/onlyoffice/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: doc.doc_id, filename: doc.filename }),
      });
      if (!res.ok) throw new Error(await res.text());
      const config = await res.json();

      // 3. Add frontend event handlers
      config.events = {
        onAppReady: () => {
          console.log('[OnlyOffice] Editor ready');
        },
        onDocumentStateChange: (event: { data: boolean }) => {
          console.log('[OnlyOffice] Dirty:', event.data);
        },
        onError: (event: { data: { errorCode: number; errorDescription: string } }) => {
          console.error('[OnlyOffice] Error:', event.data);
          setEditorState({ status: 'error', message: event.data.errorDescription });
        },
      };

      // 4. Mount editor — OnlyOffice replaces the container's contents with an iframe
      await new Promise((r) => setTimeout(r, 0)); // ensure DOM node exists
      const editor = new DocsAPI.DocEditor(EDITOR_CONTAINER_ID, config);
      editorRef.current = editor;
      setEditorState({ status: 'ready', doc });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to open document:', err);
      setEditorState({ status: 'error', message });
    }
  }, []);

  // --- Render ---

  return (
    <div className="flex h-full">
      {/* Left sidebar — upload + document list */}
      <div className="flex w-72 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">OnlyOffice Pilot</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Server-side DOCX editing</p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-accent"
            onClick={() => void fetchDocs()}
            title="Refresh document list"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Upload zone */}
        <div
          className="m-3 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted p-4 transition-colors hover:border-primary/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          ) : (
            <FileUp size={20} className="text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {uploading ? 'Uploading…' : 'Drop a .docx here'}
          </span>
          <label className="cursor-pointer rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Browse
            <input type="file" accept=".docx" className="hidden" onChange={handleFileSelect} />
          </label>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-2">
          {loadingDocs && (
            <div className="flex justify-center py-4">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          )}
          {!loadingDocs && docs.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No documents yet. Upload a .docx to get started.
            </p>
          )}
          {docs.map((doc) => (
            <button
              key={doc.doc_id}
              type="button"
              className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-accent ${
                editorState.status === 'ready' && editorState.doc.doc_id === doc.doc_id
                  ? 'bg-accent font-medium'
                  : ''
              }`}
              onClick={() => void openDocument(doc)}
            >
              <FileText size={14} className="shrink-0 text-muted-foreground" />
              <span className="truncate">{doc.filename}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main area — editor */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {editorState.status === 'idle' && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Upload and select a document to start editing
          </div>
        )}

        {editorState.status === 'loading' && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            Loading editor…
          </div>
        )}

        {editorState.status === 'error' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-destructive">
            <AlertCircle size={20} />
            <span>{editorState.message}</span>
          </div>
        )}

        {/* OnlyOffice mounts its iframe here */}
        <div
          id={EDITOR_CONTAINER_ID}
          className={`h-full w-full ${editorState.status === 'ready' ? '' : 'hidden'}`}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/pages/superuser/OnlyOfficePilot.tsx
git commit -m "feat: onlyoffice pilot page — upload, server-side doc list, editor mount"
```

---

### Task 2.4: Register the pilot page route

**Files:**
- Modify: `web/src/router.tsx`

**Step 1: Add the route**

Inside the `'/app/superuser'` route children array (after the existing layout entries), add:

```tsx
{ path: 'onlyoffice', lazy: () => import('@/pages/superuser/OnlyOfficePilot') },
```

**Step 2: Verify**

Navigate to `http://localhost:5274/app/superuser/onlyoffice`

Expected: The pilot page loads with the upload dropzone on the left and "Upload and select a document to start editing" in the main area.

**Step 3: Commit**

```bash
git add web/src/router.tsx
git commit -m "route: add /app/superuser/onlyoffice pilot page"
```

---

### Task 2.5: Add OnlyOffice to the superuser nav drill

**Files:**
- Modify: `web/src/components/shell/nav-config.ts`

**Step 1: Add the nav item**

In the `SUPERUSER_DRILL` config, add a new section or add to an existing section:

```ts
// Inside SUPERUSER_DRILL.sections, add a new section:
{
  label: 'Editors',
  items: [
    { label: 'OnlyOffice', icon: IconFileText, path: '/app/superuser/onlyoffice' },
  ],
},
```

Import `IconFileText` from `@tabler/icons-react` if not already imported.

**Step 2: Verify**

Navigate to `/app/superuser` — the left rail drill should show "OnlyOffice" under "Editors".

**Step 3: Commit**

```bash
git add web/src/components/shell/nav-config.ts
git commit -m "nav: add onlyoffice pilot to superuser drill"
```

---

## Phase 3 — Tests & Verification

### Task 3.1: Write platform-api smoke tests for the bridge

**Files:**
- Create: `services/platform-api/tests/test_onlyoffice.py`

**Step 1: Write tests**

These tests exercise the bridge endpoints without needing a running OnlyOffice Document Server. They test the upload → list → config pipeline, callback auth, the save round-trip (status=2 callback downloads from docserver and updates storage + content hash), and SSRF protection (rejects download URLs from wrong hosts or non-HTTP schemes).

```python
# services/platform-api/tests/test_onlyoffice.py
"""Smoke tests for the OnlyOffice bridge routes."""

import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch, AsyncMock

import pytest
from fastapi.testclient import TestClient

# Override settings before importing app
os.environ.setdefault("ONLYOFFICE_JWT_SECRET", "test-secret")
os.environ.setdefault("ONLYOFFICE_CALLBACK_TOKEN", "test-callback-token")
os.environ.setdefault("ONLYOFFICE_DOCSERVER_URL", "http://docserver:9980")

from app.main import create_app


@pytest.fixture
def tmp_storage(tmp_path):
    """Use a temp dir for document storage."""
    with patch.dict(os.environ, {"ONLYOFFICE_STORAGE_DIR": str(tmp_path)}):
        # Clear cached settings
        from app.core.config import get_settings
        get_settings.cache_clear()
        yield tmp_path
    get_settings.cache_clear()


@pytest.fixture
def client(tmp_storage):
    """Create a test client with superuser auth overridden."""
    from app.auth.dependencies import require_superuser, AuthPrincipal

    app = create_app()

    # Use FastAPI's dependency_overrides — the correct way to mock Depends()
    principal = AuthPrincipal(
        subject_type="user",
        subject_id="test-user",
        roles=frozenset({"platform_admin"}),
        auth_source="test",
        email="test@example.com",
    )
    app.dependency_overrides[require_superuser] = lambda: principal

    yield TestClient(app)

    app.dependency_overrides.clear()


# No special headers needed — auth is overridden at the dependency level.
# Tests that check "requires auth" use a separate client without the override.

@pytest.fixture
def unauthed_client(tmp_storage):
    """Test client with NO auth override — for testing 401 behavior."""
    app = create_app()
    return TestClient(app)


def _make_docx_bytes() -> bytes:
    """Minimal valid .docx-like bytes for testing (not a real DOCX)."""
    return b"PK\x03\x04" + b"\x00" * 100  # ZIP header prefix


class TestUploadAndList:
    def test_upload_returns_doc_id(self, client):
        resp = client.post(
            "/onlyoffice/upload",
            files={"file": ("test.docx", _make_docx_bytes(), "application/octet-stream")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "doc_id" in data
        assert data["filename"] == "test.docx"

    def test_upload_rejects_non_docx(self, client):
        resp = client.post(
            "/onlyoffice/upload",
            files={"file": ("test.pdf", b"fake", "application/octet-stream")},
        )
        assert resp.status_code == 400

    def test_upload_requires_auth(self, unauthed_client):
        resp = unauthed_client.post(
            "/onlyoffice/upload",
            files={"file": ("test.docx", _make_docx_bytes(), "application/octet-stream")},
        )
        assert resp.status_code == 401

    def test_list_shows_uploaded_docs(self, client):
        # Upload two docs
        for name in ("a.docx", "b.docx"):
            client.post(
                "/onlyoffice/upload",
                files={"file": (name, _make_docx_bytes(), "application/octet-stream")},
            )
        resp = client.get("/onlyoffice/documents")
        assert resp.status_code == 200
        docs = resp.json()
        assert len(docs) == 2
        filenames = {d["filename"] for d in docs}
        assert filenames == {"a.docx", "b.docx"}


class TestConfig:
    def test_config_returns_signed_jwt(self, client):
        # Upload first
        upload = client.post(
            "/onlyoffice/upload",
            files={"file": ("test.docx", _make_docx_bytes(), "application/octet-stream")},
        )
        doc_id = upload.json()["doc_id"]

        # Get config
        resp = client.post(
            "/onlyoffice/config",
            json={"doc_id": doc_id, "filename": "test.docx"},
        )
        assert resp.status_code == 200
        config = resp.json()
        assert "token" in config
        assert config["document"]["fileType"] == "docx"
        assert doc_id in config["document"]["url"]
        assert "token=" in config["document"]["url"]  # callback token in URL
        assert "token=" in config["editorConfig"]["callbackUrl"]

    def test_config_404_for_missing_doc(self, client):
        resp = client.post(
            "/onlyoffice/config",
            json={"doc_id": "nonexistent"},
        )
        assert resp.status_code == 404


class TestContainerRoutes:
    def test_doc_serve_requires_callback_token(self, client):
        upload = client.post(
            "/onlyoffice/upload",
            files={"file": ("test.docx", _make_docx_bytes(), "application/octet-stream")},
        )
        doc_id = upload.json()["doc_id"]

        # No token → 422 (missing required query param)
        resp = client.get(f"/onlyoffice/doc/{doc_id}")
        assert resp.status_code == 422

        # Wrong token → 401
        resp = client.get(f"/onlyoffice/doc/{doc_id}?token=wrong")
        assert resp.status_code == 401

        # Correct token → 200
        resp = client.get(f"/onlyoffice/doc/{doc_id}?token=test-callback-token")
        assert resp.status_code == 200

    def test_callback_no_changes(self, client):
        upload = client.post(
            "/onlyoffice/upload",
            files={"file": ("test.docx", _make_docx_bytes(), "application/octet-stream")},
        )
        doc_id = upload.json()["doc_id"]

        resp = client.post(
            f"/onlyoffice/callback/{doc_id}?token=test-callback-token",
            json={"status": 0},
        )
        assert resp.status_code == 200
        assert resp.json() == {"error": 0}

    def test_callback_requires_token(self, client):
        upload = client.post(
            "/onlyoffice/upload",
            files={"file": ("test.docx", _make_docx_bytes(), "application/octet-stream")},
        )
        doc_id = upload.json()["doc_id"]

        resp = client.post(
            f"/onlyoffice/callback/{doc_id}?token=wrong",
            json={"status": 0},
        )
        assert resp.status_code == 401

    def test_callback_saves_document_on_status_2(self, client, tmp_storage):
        """Status=2 callback downloads from the document server and updates storage."""
        upload = client.post(
            "/onlyoffice/upload",
            files={"file": ("test.docx", _make_docx_bytes(), "application/octet-stream")},
        )
        doc_id = upload.json()["doc_id"]
        original_meta = json.loads((tmp_storage / f"{doc_id}.meta.json").read_text())
        original_hash = original_meta["content_hash"]

        # New content that the "document server" would provide after editing
        new_content = b"PK\x03\x04" + b"\xff" * 200

        # Mock httpx.AsyncClient.get to return new bytes
        mock_response = AsyncMock()
        mock_response.content = new_content
        mock_response.raise_for_status = lambda: None

        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        with patch("app.api.routes.onlyoffice.httpx.AsyncClient", return_value=mock_client_instance):
            # Download URL must match ONLYOFFICE_DOCSERVER_URL host
            resp = client.post(
                f"/onlyoffice/callback/{doc_id}?token=test-callback-token",
                json={
                    "status": 2,
                    "url": "http://docserver:9980/cache/files/output.docx",
                },
            )

        assert resp.status_code == 200
        assert resp.json() == {"error": 0}

        # Verify the file was updated on disk
        saved_bytes = (tmp_storage / f"{doc_id}.docx").read_bytes()
        assert saved_bytes == new_content

        # Verify metadata was updated with new hash
        updated_meta = json.loads((tmp_storage / f"{doc_id}.meta.json").read_text())
        assert updated_meta["content_hash"] != original_hash
        assert updated_meta["size"] == len(new_content)

    def test_callback_rejects_download_from_wrong_host(self, client):
        """Download URL must match ONLYOFFICE_DOCSERVER_URL host."""
        upload = client.post(
            "/onlyoffice/upload",
            files={"file": ("test.docx", _make_docx_bytes(), "application/octet-stream")},
        )
        doc_id = upload.json()["doc_id"]

        resp = client.post(
            f"/onlyoffice/callback/{doc_id}?token=test-callback-token",
            json={
                "status": 2,
                "url": "http://evil.example.com/malicious.docx",
            },
        )
        assert resp.status_code == 200
        assert resp.json() == {"error": 1}

    def test_callback_rejects_non_http_scheme(self, client):
        """Download URL must use http or https scheme."""
        upload = client.post(
            "/onlyoffice/upload",
            files={"file": ("test.docx", _make_docx_bytes(), "application/octet-stream")},
        )
        doc_id = upload.json()["doc_id"]

        resp = client.post(
            f"/onlyoffice/callback/{doc_id}?token=test-callback-token",
            json={
                "status": 2,
                "url": "file:///etc/passwd",
            },
        )
        assert resp.status_code == 200
        assert resp.json() == {"error": 1}
```

**Step 2: Run tests**

```bash
cd services/platform-api && python -m pytest tests/test_onlyoffice.py -v
```

**Step 3: Commit**

```bash
git add services/platform-api/tests/test_onlyoffice.py
git commit -m "test: smoke tests for onlyoffice bridge (upload, list, config, callback auth, save round-trip, SSRF rejection)"
```

---

### Task 3.2: Manual end-to-end verification

**Prerequisites running:**
1. OnlyOffice Document Server: `cd services/onlyoffice && docker compose up -d`
2. Platform-API: `cd services/platform-api && ONLYOFFICE_STORAGE_DIR=./storage/onlyoffice uvicorn app.main:app --port 8000 --reload`
3. Web dev server: `cd web && npm run dev`

**Test sequence:**

1. Open `http://localhost:5274/app/superuser/onlyoffice`
2. Upload a `.docx` file via the dropzone
3. Verify the file appears in the sidebar document list
4. Click the file — the editor should load:
   - OnlyOffice JS API loads from `/oo-api/...` (proxied to localhost:9980)
   - Frontend POSTs to `/onlyoffice/config` with Supabase JWT to get signed config
   - OnlyOffice editor iframe mounts
   - Container fetches the doc from `{ONLYOFFICE_BRIDGE_URL}/onlyoffice/doc/{id}?token=...`
   - Editor renders the DOCX with full toolbar (tracked changes, comments, etc.)
5. Edit the document inside the OnlyOffice editor
6. Close the browser tab (or wait for autosave / force-save)
7. Verify save callback:
   - Check platform-api logs for `Callback for {doc_id}: status=2`
   - Check that the file in `storage/onlyoffice/{doc_id}.docx` has been updated
8. Refresh the page — document list loads from server, click it — edits persist
9. Verify nav — the superuser drill shows "OnlyOffice" under "Editors"

**Common failure points:**

| Symptom | Cause | Fix |
|---|---|---|
| "Failed to load OnlyOffice API script" | Document Server not running or wrong port | `curl http://localhost:9980/healthcheck` |
| Editor loads but shows "Download failed" | Container can't reach platform-api | Check `ONLYOFFICE_BRIDGE_URL` and network connectivity |
| Callback save fails with "Blocked download from untrusted host" | Download URL host doesn't match `ONLYOFFICE_DOCSERVER_URL` | Ensure `ONLYOFFICE_DOCSERVER_URL` matches the actual Document Server hostname (e.g. `http://localhost:9980` for dev, `http://documentserver` for Docker network) |
| 401 on upload/list/config | Missing or invalid Supabase JWT | Check browser console for auth errors, verify superuser status |
| Edits don't save | Callback URL unreachable or wrong token | Check `ONLYOFFICE_CALLBACK_TOKEN` matches in both services |
| JWT error in editor | Secret mismatch | `JWT_SECRET` in docker-compose must match `ONLYOFFICE_JWT_SECRET` in platform-api env |
| Stale document after re-edit | OnlyOffice cached old `doc_key` | Key uses content hash, so check that callback actually wrote the file |

---

## Dependency Map

```
Phase 0 (dev preflight + dependencies)
  └─ Phase 1 (platform-api bridge: auth, storage, config, serve, callback)
       └─ Phase 2 (Vite proxy + types + pilot page + route + nav)
            └─ Phase 3 (smoke tests + manual verification)
```

All phases are sequential — each depends on the previous.

---

## What This Plan Does NOT Include (Deferred)

- **Local mode (File System Access API)** — Upload-on-open / download-on-save shuttle for editing local files through OnlyOffice. Layers on top of this pilot since the OnlyOffice integration is identical; only the edge transport changes.
- **Editor registry integration** — The pilot is deliberately separate from `editorRegistry.ts`. If viable, a future plan bridges OnlyOffice into the registry.
- **Supabase / GCS storage** — Pilot uses a Docker volume. Production swaps to cloud storage with signed URLs.
- **Multi-user collaboration** — OnlyOffice supports co-editing out of the box, but the pilot doesn't set up user identity in the editor config.
- **XLSX/PPTX support** — The bridge only handles `.docx`. Extending to other formats requires minimal changes (fileType detection, MIME types).
- **DOCX → Markdown conversion** — OnlyOffice keeps DOCX as source of truth. Downstream conversion (e.g. via Pandoc or Docling) is a separate concern.
- **Production deployment** — HTTPS, proper secrets management, reverse proxy, container networking via Docker service names instead of `host.docker.internal`.
- **Track Changes / Suggest Changes mapping** — OnlyOffice has built-in Track Changes. A future plan could explore how this maps to the `prosemirror-suggest-changes` workflow.