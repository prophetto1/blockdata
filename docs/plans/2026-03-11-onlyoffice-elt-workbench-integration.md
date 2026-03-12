# OnlyOffice ELT Workbench Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a user clicks a `.docx` file in the ELT workbench assets panel, they see a read-only preview (existing `DocxPreview`) with an "Edit in OnlyOffice" toggle that switches to a live OnlyOffice editor — all within the same workbench tab, using the existing Supabase Storage pipeline for file storage.

**Architecture:** The OnlyOffice Document Server is a server-native editor — it fetches documents from a URL and saves via callback. It cannot fetch directly from Supabase Storage (signed URLs expire, no callback mechanism). So platform-api acts as a **shuttle**: on edit-open it pulls the `.docx` from Supabase Storage into a local cache, serves it to the OnlyOffice container, and on save callback writes the modified file back to Supabase Storage. The frontend adds a preview/edit mode toggle to `PreviewTabPanel` for `.docx` files. No new pages, no new routes, no separate upload flow — OnlyOffice plugs into the existing document pipeline.

**Tech Stack:** React 19, FastAPI (platform-api), PyJWT, python-multipart, supabase-py, OnlyOffice Document Server (Docker, Community Edition), Vite dev proxy

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
python-multipart>=0.0.9
```

`PyJWT` signs OnlyOffice editor configs. `python-multipart` is required by FastAPI for `UploadFile` / `File(...)` — without it, upload endpoints throw a runtime error.

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

## Phase 1 — Platform-API Bridge (Supabase Storage Shuttle)

The bridge's job is to shuttle files between Supabase Storage and the OnlyOffice container. It does not have its own permanent storage — it uses a local cache directory for the duration of an editing session.

### Task 1.1: Add OnlyOffice settings to config

**Files:**
- Modify: `services/platform-api/app/core/config.py`

**Step 1: Add fields to the Settings dataclass**

```python
    onlyoffice_jwt_secret: str = ""
    onlyoffice_storage_dir: str = ""
    onlyoffice_callback_token: str = ""
    onlyoffice_bridge_url: str = ""
    onlyoffice_docserver_url: str = ""
```

**Step 2: Load them in `from_env()`**

Add to the `return cls(...)` call:

```python
    onlyoffice_jwt_secret=os.environ.get("ONLYOFFICE_JWT_SECRET", "my-jwt-secret-change-me"),
    onlyoffice_storage_dir=os.environ.get("ONLYOFFICE_STORAGE_DIR", "/app/cache/onlyoffice"),
    onlyoffice_callback_token=os.environ.get("ONLYOFFICE_CALLBACK_TOKEN", "oo-callback-secret-change-me"),
    onlyoffice_bridge_url=os.environ.get("ONLYOFFICE_BRIDGE_URL", "http://host.docker.internal:8000"),
    onlyoffice_docserver_url=os.environ.get("ONLYOFFICE_DOCSERVER_URL", "http://localhost:9980"),
```

**Step 3: Commit**

```bash
git add services/platform-api/app/core/config.py
git commit -m "config: add onlyoffice settings (jwt, cache dir, bridge url, docserver url)"
```

---

### Task 1.2: Create the OnlyOffice bridge router

**Files:**
- Create: `services/platform-api/app/api/routes/onlyoffice.py`

This bridge is a **Supabase Storage shuttle** — it pulls files from Supabase Storage into a local cache for the OnlyOffice container to access, and writes modified files back to Supabase Storage on save callback.

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
- Browser-facing routes: Depends(require_auth) — Supabase JWT
- Container-facing routes: ONLYOFFICE_CALLBACK_TOKEN query param
"""

import hashlib
import json
import logging
import uuid
from pathlib import Path
from urllib.parse import urlparse

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from supabase import create_client

from app.auth.dependencies import require_auth, AuthPrincipal
from app.core.config import get_settings

logger = logging.getLogger("platform-api.onlyoffice")

router = APIRouter(prefix="/onlyoffice", tags=["onlyoffice"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DOCUMENTS_BUCKET = "documents"


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
    secret = get_settings().onlyoffice_jwt_secret
    if not secret:
        raise HTTPException(500, "ONLYOFFICE_JWT_SECRET not configured")
    return jwt.encode(payload, secret, algorithm="HS256")


def _verify_callback_token(token: str) -> None:
    expected = get_settings().onlyoffice_callback_token
    if not expected:
        raise HTTPException(500, "ONLYOFFICE_CALLBACK_TOKEN not configured")
    if token != expected:
        raise HTTPException(401, "Invalid callback token")


def _supabase_admin():
    """Create a Supabase admin client for storage operations."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


# ---------------------------------------------------------------------------
# 1. Open — pull file from Supabase Storage into local cache
# ---------------------------------------------------------------------------

class OpenRequest(BaseModel):
    source_uid: str
    source_locator: str
    filename: str


@router.post("/open")
async def open_document(
    req: OpenRequest,
    _auth: AuthPrincipal = Depends(require_auth),
):
    """Pull a file from Supabase Storage into the local cache for editing.

    Returns a session_id that identifies this editing session.
    The session_id is used for all subsequent operations.
    """
    settings = get_settings()
    if not settings.onlyoffice_jwt_secret:
        raise HTTPException(503, "OnlyOffice is not configured")

    # Download from Supabase Storage
    storage_key = req.source_locator.lstrip("/")
    sb = _supabase_admin()
    try:
        content = sb.storage.from_(DOCUMENTS_BUCKET).download(storage_key)
    except Exception as e:
        logger.error(f"Failed to download {storage_key} from Supabase Storage: {e}")
        raise HTTPException(502, f"Failed to fetch file from storage: {e}")

    # Write to local cache
    session_id = uuid.uuid4().hex[:12]
    _session_doc_path(session_id).write_bytes(content)
    _write_session(session_id, {
        "session_id": session_id,
        "source_uid": req.source_uid,
        "source_locator": req.source_locator,
        "filename": req.filename,
        "content_hash": _content_hash(content),
        "size": len(content),
    })
    logger.info(f"Opened {req.filename} (source_uid={req.source_uid}) as session {session_id}")

    return {"session_id": session_id, "filename": req.filename}


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
    """Generate a JWT-signed OnlyOffice editor config for an open session."""
    session = _read_session(req.session_id)
    path = _session_doc_path(req.session_id)
    if not path.is_file():
        raise HTTPException(404, f"Session file not found for {req.session_id}")

    settings = get_settings()
    bridge_url = settings.onlyoffice_bridge_url
    cb_token = settings.onlyoffice_callback_token

    doc_key = f"{req.session_id}_{session.get('content_hash', 'initial')}"

    config = {
        "document": {
            "fileType": "docx",
            "key": doc_key,
            "title": session.get("filename", "document.docx"),
            "url": f"{bridge_url}/onlyoffice/doc/{req.session_id}?token={cb_token}",
        },
        "editorConfig": {
            "mode": req.mode,
            "callbackUrl": f"{bridge_url}/onlyoffice/callback/{req.session_id}?token={cb_token}",
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
    _verify_callback_token(token)
    path = _session_doc_path(session_id)
    if not path.is_file():
        raise HTTPException(404, f"Session {session_id} not found")
    session = _read_session(session_id)
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=session.get("filename", f"{session_id}.docx"),
    )


# ---------------------------------------------------------------------------
# 4. Save callback — download modified file, write back to Supabase Storage
# ---------------------------------------------------------------------------

@router.post("/callback/{session_id}")
async def save_callback(session_id: str, request: Request, token: str = Query(...)):
    """Handle save callbacks from the OnlyOffice Document Server.

    On status 2 or 6 (ready for saving / force-save):
    1. Downloads the modified file from the Document Server
    2. Updates the local cache
    3. Writes the modified file back to Supabase Storage at the original locator
    """
    _verify_callback_token(token)
    settings = get_settings()

    body = await request.json()
    status = body.get("status")
    logger.info(f"Callback for session {session_id}: status={status}")

    if status in (2, 6):
        download_url = body.get("url")
        if not download_url:
            logger.error(f"No download URL in callback for {session_id}")
            return {"error": 1}

        # SSRF protection: constrain download URL to the Document Server host
        docserver_host = urlparse(settings.onlyoffice_docserver_url).hostname
        parsed_download = urlparse(download_url)

        if parsed_download.scheme not in {"http", "https"}:
            logger.error(f"Blocked download with invalid scheme: {parsed_download.scheme}")
            return {"error": 1}

        if parsed_download.hostname != docserver_host:
            logger.error(f"Blocked download from untrusted host: {parsed_download.hostname}")
            return {"error": 1}

        try:
            # Download modified file from OnlyOffice
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(download_url)
                resp.raise_for_status()

            new_content = resp.content

            # Update local cache
            _session_doc_path(session_id).write_bytes(new_content)

            session = _read_session(session_id)
            session["content_hash"] = _content_hash(new_content)
            session["size"] = len(new_content)
            _write_session(session_id, session)

            # Write back to Supabase Storage at original locator
            storage_key = session["source_locator"].lstrip("/")
            sb = _supabase_admin()
            sb.storage.from_(DOCUMENTS_BUCKET).update(
                storage_key,
                new_content,
                {"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
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

### Task 1.3: Mount the bridge router in main.py

**Files:**
- Modify: `services/platform-api/app/main.py`

**Step 1: Add the router**

Insert after the functions router mount (line 73), before the plugin catch-all:

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

### Task 2.3: Create the `useOnlyOfficeEditor` hook

This hook encapsulates the entire OnlyOffice lifecycle: script loading, session opening, config fetching, editor mounting/destroying. It's used by the preview panel to swap between read-only preview and live editing.

**Files:**
- Create: `web/src/hooks/useOnlyOfficeEditor.ts`

**Step 1: Write the hook**

```ts
// web/src/hooks/useOnlyOfficeEditor.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
// Auth helper — reuse the shared pattern from lib/edge.ts
// ---------------------------------------------------------------------------

const PLATFORM_API_URL = (
  import.meta.env.VITE_PIPELINE_WORKER_URL ?? 'http://localhost:8000'
).replace(/\/+$/, '');

async function getAccessToken(): Promise<string> {
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

async function bridgeFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${PLATFORM_API_URL}${path}`, { ...init, headers });
}

// ---------------------------------------------------------------------------
// Script loader
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
// Hook
// ---------------------------------------------------------------------------

export function useOnlyOfficeEditor(
  containerId: string,
  doc: { source_uid: string; source_locator: string; filename: string } | null,
  active: boolean,
) {
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
    if (!active || !doc) {
      destroy();
      setState({ status: 'idle' });
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
        // 1. Load OnlyOffice JS API
        await loadOnlyOfficeApi();
        if (cancelled) return;

        // 2. Open session — pull file from Supabase Storage into bridge cache
        const openRes = await bridgeFetch('/onlyoffice/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_uid: doc.source_uid,
            source_locator: doc.source_locator,
            filename: doc.filename,
          }),
        });
        if (!openRes.ok) throw new Error(await openRes.text());
        const { session_id } = await openRes.json();
        if (cancelled) return;

        sessionRef.current = { sessionId: session_id, filename: doc.filename };

        // 3. Get signed editor config
        const configRes = await bridgeFetch('/onlyoffice/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id }),
        });
        if (!configRes.ok) throw new Error(await configRes.text());
        const config = await configRes.json();
        if (cancelled) return;

        // 4. Add event handlers
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

        // 5. Mount editor
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
  }, [active, doc?.source_uid, containerId, destroy]);

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

### Task 2.4: Create the `OnlyOfficeEditorPanel` component

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
  const filename = doc.doc_title?.split('/').pop() ?? doc.doc_title ?? 'document.docx';

  const { state } = useOnlyOfficeEditor(
    EDITOR_CONTAINER_ID,
    {
      source_uid: doc.source_uid,
      source_locator: doc.source_locator ?? '',
      filename,
    },
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

### Task 2.5: Add "Edit in OnlyOffice" toggle to PreviewTabPanel

This is the key integration point. When viewing a `.docx` file, the unified preview header gets an "Edit" / "Preview" toggle button. Clicking "Edit" lazy-loads the `OnlyOfficeEditorPanel` and hides the `DocxPreview`. Clicking "Preview" destroys the editor and shows the read-only preview again.

**Files:**
- Modify: `web/src/components/documents/PreviewTabPanel.tsx`

**Step 1: Add imports at top of file**

After the existing imports, add:

```tsx
import { lazy, Suspense, useState as useStateReact } from 'react';
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

**Step 2: Add edit mode state**

Inside the `PreviewTabPanel` component, after the existing state declarations (around line 34), add:

```tsx
  const [docxEditMode, setDocxEditMode] = useState(false);
```

**Step 3: Reset edit mode when document changes**

Inside the existing `useEffect` that resets state when `doc` changes (the one starting at line 36), add inside the `loadPreview` function, at the top before `if (!doc)`:

```tsx
      setDocxEditMode(false);
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
        onClick={() => setDocxEditMode((prev) => !prev)}
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

    return renderPreviewWithUnifiedHeader(
      <DocxPreview
        key={`${doc.source_uid}:${previewUrl}`}
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
"""Smoke tests for the OnlyOffice bridge routes."""

import json
import os
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

# Override settings before importing app
os.environ.setdefault("ONLYOFFICE_JWT_SECRET", "test-secret")
os.environ.setdefault("ONLYOFFICE_CALLBACK_TOKEN", "test-callback-token")
os.environ.setdefault("ONLYOFFICE_DOCSERVER_URL", "http://docserver:9980")
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")

from app.main import create_app


@pytest.fixture
def tmp_cache(tmp_path):
    """Use a temp dir for the bridge cache."""
    with patch.dict(os.environ, {"ONLYOFFICE_STORAGE_DIR": str(tmp_path)}):
        from app.core.config import get_settings
        get_settings.cache_clear()
        yield tmp_path
    get_settings.cache_clear()


@pytest.fixture
def mock_supabase_storage():
    """Mock Supabase storage operations."""
    mock_bucket = MagicMock()
    mock_bucket.download.return_value = b"PK\x03\x04" + b"\x00" * 100
    mock_bucket.update.return_value = None

    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket

    with patch("app.api.routes.onlyoffice._supabase_admin", return_value=mock_client):
        yield mock_bucket


@pytest.fixture
def client(tmp_cache, mock_supabase_storage):
    """Test client with auth overridden."""
    from app.auth.dependencies import require_auth, AuthPrincipal

    app = create_app()

    principal = AuthPrincipal(
        subject_type="user",
        subject_id="test-user",
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
            json={
                "source_uid": "abc123",
                "source_locator": "/uploads/abc123/test.docx",
                "filename": "test.docx",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "session_id" in data
        assert data["filename"] == "test.docx"

    def test_config_returns_signed_jwt(self, client):
        # Open first
        open_resp = client.post(
            "/onlyoffice/open",
            json={
                "source_uid": "abc123",
                "source_locator": "/uploads/abc123/test.docx",
                "filename": "test.docx",
            },
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


class TestContainerRoutes:
    def test_doc_serve_requires_token(self, client):
        open_resp = client.post(
            "/onlyoffice/open",
            json={
                "source_uid": "abc123",
                "source_locator": "/uploads/abc123/test.docx",
                "filename": "test.docx",
            },
        )
        session_id = open_resp.json()["session_id"]

        # Wrong token
        resp = client.get(f"/onlyoffice/doc/{session_id}?token=wrong")
        assert resp.status_code == 401

        # Correct token
        resp = client.get(f"/onlyoffice/doc/{session_id}?token=test-callback-token")
        assert resp.status_code == 200

    def test_callback_writes_back_to_supabase(self, client, tmp_cache, mock_supabase_storage):
        open_resp = client.post(
            "/onlyoffice/open",
            json={
                "source_uid": "abc123",
                "source_locator": "/uploads/abc123/test.docx",
                "filename": "test.docx",
            },
        )
        session_id = open_resp.json()["session_id"]

        new_content = b"PK\x03\x04" + b"\xff" * 200

        mock_response = AsyncMock()
        mock_response.content = new_content
        mock_response.raise_for_status = lambda: None

        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(return_value=mock_response)
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        with patch("app.api.routes.onlyoffice.httpx.AsyncClient", return_value=mock_client_instance):
            resp = client.post(
                f"/onlyoffice/callback/{session_id}?token=test-callback-token",
                json={
                    "status": 2,
                    "url": "http://docserver:9980/cache/files/output.docx",
                },
            )

        assert resp.status_code == 200
        assert resp.json() == {"error": 0}

        # Verify Supabase Storage update was called
        mock_supabase_storage.update.assert_called_once()
        call_args = mock_supabase_storage.update.call_args
        assert call_args[0][0] == "uploads/abc123/test.docx"
        assert call_args[0][1] == new_content

    def test_callback_rejects_wrong_host(self, client):
        open_resp = client.post(
            "/onlyoffice/open",
            json={
                "source_uid": "abc123",
                "source_locator": "/uploads/abc123/test.docx",
                "filename": "test.docx",
            },
        )
        session_id = open_resp.json()["session_id"]

        resp = client.post(
            f"/onlyoffice/callback/{session_id}?token=test-callback-token",
            json={
                "status": 2,
                "url": "http://evil.example.com/malicious.docx",
            },
        )
        assert resp.status_code == 200
        assert resp.json() == {"error": 1}
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
   - Browser calls `POST /onlyoffice/open` with the `source_uid` and `source_locator`
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
  └─ Phase 1 (bridge: open from Supabase, config, serve, callback → write back to Supabase)
       └─ Phase 2 (vite proxy + types + hook + panel component + PreviewTabPanel toggle)
            └─ Phase 3 (smoke tests + manual e2e)
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