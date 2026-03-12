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
from typing import Literal

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
_PLACEHOLDER_SECRETS = {"", "my-jwt-secret-change-me"}


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


def _require_jwt_secret() -> str:
    """Return the JWT secret or raise if unset / left at placeholder."""
    secret = get_settings().onlyoffice_jwt_secret
    if secret in _PLACEHOLDER_SECRETS:
        raise HTTPException(500, "ONLYOFFICE_JWT_SECRET not configured (set a real secret)")
    return secret


def _sign_config(payload: dict) -> str:
    """Sign the OnlyOffice editor config payload (JWT for the editor iframe)."""
    return jwt.encode(payload, _require_jwt_secret(), algorithm="HS256")


def _sign_session_token(session_id: str) -> str:
    """Create a short-lived, per-session JWT for container-facing routes."""
    payload = {
        "sub": session_id,
        "purpose": "oo-session",
        "exp": int(time.time()) + SESSION_TOKEN_TTL,
    }
    return jwt.encode(payload, _require_jwt_secret(), algorithm="HS256")


def _verify_session_token(session_id: str, token: str) -> None:
    """Verify a per-session JWT on container-facing routes."""
    secret = _require_jwt_secret()
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
    source_uid: str


@router.post("/open")
async def open_document(
    req: OpenRequest,
    _auth: AuthPrincipal = Depends(require_auth),
):
    """Look up a document by source_uid, verify ownership, then pull from
    Supabase Storage into the local cache for editing.

    Returns a session_id that identifies this editing session.
    """
    settings = get_settings()
    if settings.onlyoffice_jwt_secret in _PLACEHOLDER_SECRETS:
        raise HTTPException(503, "OnlyOffice is not configured (set ONLYOFFICE_JWT_SECRET)")

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

    # Only DOCX files are supported — reject anything else before pulling
    # from storage, since the bridge hardcodes fileType: "docx" and serves
    # all cached files with the DOCX content type.
    if not filename.lower().endswith(".docx"):
        raise HTTPException(
            400,
            f"Only .docx files can be edited in OnlyOffice (got: {filename})",
        )

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
    mode: Literal["edit", "view"] = "edit"


@router.post("/config")
async def generate_config(
    req: ConfigRequest,
    _auth: AuthPrincipal = Depends(require_auth),
):
    """Generate a JWT-signed OnlyOffice editor config for an open session."""
    session = _read_session(req.session_id)

    if session.get("owner_id") != _auth.subject_id:
        raise HTTPException(403, "You do not own this editing session")

    path = _session_doc_path(req.session_id)
    if not path.is_file():
        raise HTTPException(404, f"Session file not found for {req.session_id}")

    settings = get_settings()
    bridge_url = settings.onlyoffice_bridge_url

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
# 3. Serve cached file to OnlyOffice container (per-session token auth)
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
    1. Optimistic concurrency check against current storage content
    2. Downloads the modified file from the Document Server
    3. Updates the local cache
    4. Writes the modified file back to Supabase Storage
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

        # SSRF protection: validate the full origin (scheme + host + port)
        # against onlyoffice_docserver_internal_url. Hostname-only checks are
        # insufficient — a browser-held session token could be used to point
        # the bridge at another local service on a different port.
        internal_url = settings.onlyoffice_docserver_internal_url or settings.onlyoffice_docserver_url
        allowed = urlparse(internal_url)
        parsed_download = urlparse(download_url)

        allowed_port = allowed.port or (443 if allowed.scheme == "https" else 80)
        download_port = parsed_download.port or (443 if parsed_download.scheme == "https" else 80)

        if parsed_download.scheme not in {"http", "https"}:
            logger.error(f"Blocked download with invalid scheme: {parsed_download.scheme}")
            return {"error": 1}

        if (
            parsed_download.scheme != allowed.scheme
            or parsed_download.hostname != allowed.hostname
            or download_port != allowed_port
        ):
            logger.error(
                f"Blocked download from untrusted origin: "
                f"{parsed_download.scheme}://{parsed_download.hostname}:{download_port} "
                f"(expected {allowed.scheme}://{allowed.hostname}:{allowed_port})"
            )
            return {"error": 1}

        try:
            session = _read_session(session_id)

            # Optimistic concurrency check
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
                    return {"error": 1}
            except Exception as e:
                # Fail closed: if we can't verify current state, refuse the write
                logger.error(f"Concurrency check failed for session {session_id}, refusing save: {e}")
                return {"error": 1}

            new_content = await download_bytes(download_url)

            _session_doc_path(session_id).write_bytes(new_content)

            session["content_hash"] = _content_hash(new_content)
            session["size"] = len(new_content)
            _write_session(session_id, session)

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
