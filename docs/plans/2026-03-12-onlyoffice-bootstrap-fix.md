# OnlyOffice Environment Bootstrap Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the OnlyOffice DOCX editor work end-to-end in the ELT workbench by fixing the environment bootstrap (not the React code), then adding route-level backend tests and tightening the DOCX gate.

**Architecture:** Three services must be running and reachable through specific network paths for the Edit button to work. The browser talks to the Vite dev server, which proxies `/oo-api` to the Document Server (port 9980) and `/platform-api` to the bridge (port 8000). The bridge shuttles files between Supabase Storage and a local cache. The Document Server container fetches files from the bridge via `host.docker.internal:8000`. This plan brings up all three services, verifies each network boundary, then adds proper test coverage and tightens the DOCX gate.

**Tech Stack:** Docker Compose (OnlyOffice Document Server), FastAPI/uvicorn (bridge), Vite (dev proxy), Supabase (storage + auth)

---

## Network Topology Reference

```
Browser (Vite dev origin, default localhost:5274, bound 0.0.0.0)
  ├── /oo-api/*  ──Vite proxy──→ localhost:9980 (Document Server)
  ├── /platform-api/*  ──Vite proxy──→ localhost:8000 (Bridge)
  └── loads DocsAPI.DocEditor → iframe to Document Server

Document Server container (port 9980)
  ├── fetches doc from: http://host.docker.internal:8000/onlyoffice/doc/{session_id}
  └── sends callbacks to: http://host.docker.internal:8000/onlyoffice/callback/{session_id}
```

## Key Files

| File | Role |
|------|------|
| `services/onlyoffice/docker-compose.yml` | Document Server + Postgres + RabbitMQ |
| `services/onlyoffice/.env` | `ONLYOFFICE_JWT_SECRET`, `ONLYOFFICE_PORT` |
| `services/platform-api/start-dev.sh` | Bridge startup (loads `.env` + `onlyoffice/.env`) |
| `services/platform-api/app/api/routes/onlyoffice.py` | Bridge routes: `/open`, `/config`, `/doc`, `/callback` |
| `services/platform-api/app/infra/storage.py` | `download_from_storage()`, `upsert_to_storage()` |
| `services/platform-api/tests/conftest.py` | Existing shared fixture: `clear_settings_cache` (autouse) |
| `services/platform-api/tests/test_auth.py` | Existing auth tests — uses bare `TestClient(app)` pattern |
| `web/vite.config.ts:76-87` | Vite proxy: `/oo-api` → 9980, `/platform-api` → 8000 |
| `web/src/hooks/useOnlyOfficeEditor.ts` | Hook: loads OO JS API, calls `/open` + `/config`, mounts editor |
| `web/src/components/documents/OnlyOfficeEditorPanel.tsx` | React panel that calls the hook |
| `web/src/components/documents/PreviewTabPanel.tsx:350-385` | Edit/Preview toggle (flips `docxEditMode`) |

---

## Task 1: Start the OnlyOffice Document Server

**Files:** None modified. Uses `services/onlyoffice/docker-compose.yml` and `services/onlyoffice/.env`.

**Step 1: Start the containers**

Run:
```bash
cd /home/jon/BD2/services/onlyoffice && docker compose up -d
```

Expected: Three containers start (postgres, rabbitmq, documentserver). The documentserver has a `start_period: 30s` healthcheck — it takes ~30-60 seconds to become healthy.

**Step 2: Wait for healthy**

Run:
```bash
docker compose -f /home/jon/BD2/services/onlyoffice/docker-compose.yml ps
```

Expected: All three services show `healthy` status. If documentserver shows `starting`, wait 30 seconds and check again.

**Step 3: Verify healthcheck endpoint**

Run:
```bash
curl -sf http://localhost:9980/healthcheck && echo " OK"
```

Expected: `true OK`

**Step 4: Verify JS API script is accessible**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:9980/web-apps/apps/api/documents/api.js
```

Expected: `200`

**If it fails:** Check `docker compose logs documentserver` for startup errors. Common issue: port 9980 already in use.

---

## Task 2: Start the platform-api bridge

**Files:** None modified. Uses `services/platform-api/start-dev.sh`.

**Step 1: Kill any existing uvicorn on port 8000**

Run:
```bash
lsof -ti:8000 | xargs -r kill
```

**Step 2: Start with the bootstrap script**

Run (in a separate terminal or background):
```bash
/home/jon/BD2/services/platform-api/start-dev.sh
```

Expected output includes:
```
=== OnlyOffice Bridge Config ===
BRIDGE_URL:    http://host.docker.internal:8000
DOCSERVER_URL: http://localhost:9980
JWT_SECRET:    set (<N> chars)
STORAGE_DIR:   /tmp/onlyoffice-cache
SUPABASE_URL:  <non-empty Supabase project URL>
================================
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Verify all five values are non-empty. If `JWT_SECRET` shows nothing, the `services/onlyoffice/.env` file is missing or has a blank value.

**Step 3: Verify health endpoint**

Run:
```bash
curl -sf http://localhost:8000/health
```

Expected: JSON with `"status":"ok"` and a non-zero function count.

**If it fails:** Check the terminal running `start-dev.sh` for Python import errors. Common issue: missing `httpx` or `PyJWT` — run `pip install -r services/platform-api/requirements.txt`.

---

## Task 3: Verify the Vite dev server proxy

**Files:** None modified. Uses `web/vite.config.ts:76-87`.

**Step 1: Restart Vite if it's already running**

Run:
```bash
cd /home/jon/BD2/web && npm run dev
```

Or if already running, stop and restart it so it picks up the proxy config.

**Step 2: Verify Vite is serving**

Run:
```bash
curl -sf http://localhost:5274 | head -5
```

Expected: HTML of the app's index page.

**Step 3: Verify /oo-api proxy**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5274/oo-api/web-apps/apps/api/documents/api.js
```

Expected: `200` (proxied to Document Server on 9980)

**Step 4: Verify /platform-api proxy**

Run:
```bash
curl -sf http://localhost:5274/platform-api/health
```

Expected: JSON with `"status":"ok"` (proxied to bridge on 8000)

**If /oo-api fails:** Document Server is down (go back to Task 1).
**If /platform-api fails:** Bridge is down (go back to Task 2).

---

## Task 4: End-to-end smoke test from curl

**Files:** None modified.

**Why:** Before testing in the browser, verify the full chain works from the command line. This isolates backend issues from frontend issues.

**Step 1: Get a valid Supabase JWT**

From the browser: DevTools → Application tab → Local Storage → click the site origin → find the key that starts with `sb-` and ends with `-auth-token` → expand the JSON → copy the `access_token` value.

Store it:
```bash
TOKEN="<paste access_token here>"
```

**Step 2: Discover an owned DOCX source_uid**

Query `view_documents` for DOCX files owned by the current user. The user ID is the `sub` claim in the JWT — decode it at jwt.io or run:

```bash
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool | grep sub
```

Then find a DOCX:
```bash
curl -s "https://<your-supabase-ref>.supabase.co/rest/v1/view_documents?source_locator=ilike.*docx&owner_id=eq.<user-id>&select=source_uid,doc_title,source_locator&limit=3" \
  -H "apikey: <anon-key from .env VITE_SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer $TOKEN"
```

Or use the Supabase dashboard SQL editor:
```sql
SELECT source_uid, doc_title, source_locator
FROM view_documents
WHERE source_locator ILIKE '%.docx'
  AND owner_id = '<user-id>'
LIMIT 3;
```

Pick any `source_uid` from the results and store it:
```bash
SOURCE_UID="<paste here>"
```

**Step 3: Test /open**

Run:
```bash
curl -s http://localhost:8000/onlyoffice/open \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"source_uid\": \"$SOURCE_UID\"}"
```

Expected: `{"session_id":"<12-char-hex>","filename":"<name>.docx"}`

Failure diagnosis:
- `401` → Browser JWT is expired or malformed. Get a fresh token. (This is distinct from a missing `SUPABASE_SERVICE_ROLE_KEY`, which would cause a Python-level exception logged in the bridge terminal, not a clean 401.)
- `404` → `source_uid` not found in `view_documents`. Verify the UID exists.
- `403` → The JWT's `sub` claim does not match the document's `owner_id`.
- `400` → File extension is not `.docx`.
- `500` → Unhandled exception in the bridge. Check the `start-dev.sh` terminal for the traceback. Common causes: missing env var (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), or storage download failure.
- `502` → Supabase Storage returned an error during download. Check that the `source_locator` path exists in the `documents` bucket.
- `503` → `ONLYOFFICE_JWT_SECRET` is still a placeholder value.

**Step 4: Test /config**

Run:
```bash
SESSION_ID="<session_id from step 3>"
curl -s http://localhost:8000/onlyoffice/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\"}"
```

Expected: JSON with `document.url` (containing `host.docker.internal:8000`), `editorConfig.callbackUrl`, and `token` field.

**Step 5: Verify the Document Server container can reach the bridge**

Run:
```bash
DOC_URL="<document.url value from step 4>"
docker exec $(docker ps -q -f name=documentserver) curl -s -o /dev/null -w "%{http_code}" "$DOC_URL"
```

Expected: `200` — the container fetched the cached DOCX via `host.docker.internal:8000`.

If this returns `000` or connection refused: `host.docker.internal` is not resolving inside the container. Check that `extra_hosts: ["host.docker.internal:host-gateway"]` is in `docker-compose.yml:76-77` (it is).

---

## Task 5: Browser test

**Files:** None modified.

**Prerequisites:** All Task 4 checks pass.

**Step 1: Open the ELT workbench in the browser**

Navigate to the project in the app. The ELT workbench should show the assets list on the left.

**Step 2: Select a .docx file from assets**

Click on a `.docx` file. The preview pane should show a DOCX preview (rendered by `DocxPreview`).

**Step 3: Click Edit**

Click the **Edit** button in the preview header bar (top-right of preview pane).

Expected behavior:
1. Button text changes to **Preview**
2. Loading spinner appears ("Loading editor...")
3. Browser network tab shows three requests:
   - `GET /oo-api/web-apps/apps/api/documents/api.js` → 200
   - `POST /platform-api/onlyoffice/open` → 200
   - `POST /platform-api/onlyoffice/config` → 200
4. OnlyOffice editor iframe appears

**If it fails:** Open DevTools Network tab. The first failing request tells you which boundary broke:
- `/oo-api/...` fails → Document Server is down
- `/platform-api/onlyoffice/open` fails → Bridge is down or auth issue
- `/platform-api/onlyoffice/config` fails → Session issue
- Editor loads but shows error → Container can't reach bridge (container networking)

**Step 4: Click Preview to toggle back**

Click **Preview**. The DOCX preview should re-render (the `docxPreviewRevision` counter increments to force a fresh fetch in case the doc was edited).

---

## Task 6: Add route-level bridge tests with proper fixture lifecycle

**Files:**
- Modify: `services/platform-api/tests/conftest.py` (merge new fixture into existing file)
- Create: `services/platform-api/tests/test_onlyoffice.py`

**Why:** The previous `test_onlyoffice.py` was deleted because TestClient wasn't closed properly, causing pytest to hang. This task restores route-level coverage for `/open`, `/config`, `/doc`, `/callback` with a properly-scoped client fixture. The existing `conftest.py` already has a `clear_settings_cache` autouse fixture — we merge with it, not replace it.

**Step 1: Add a `client` fixture to the existing conftest.py**

Modify `services/platform-api/tests/conftest.py`. The file currently contains only the `clear_settings_cache` autouse fixture. **Append** the new fixture below the existing one — do not remove the settings cache fixture.

Current file:
```python
import pytest


@pytest.fixture(autouse=True)
def clear_settings_cache():
    """Clear cached settings before and after each test."""
    from app.core.config import get_settings
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
```

Add after the existing fixture:

```python
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture()
def client():
    """Yield a TestClient that is properly closed after the test.

    Uses context manager to ensure ASGI lifespan cleanup.
    Existing tests that instantiate TestClient(app) directly
    (e.g. test_auth.py) still work but may hang on teardown —
    migrate them to this fixture over time.
    """
    with TestClient(app) as c:
        yield c
```

**Step 2: Write the route-level test file**

Create `services/platform-api/tests/test_onlyoffice.py`:

```python
"""Route-level tests for the OnlyOffice bridge.

Covers: /open, /config, /doc, /callback — with mocked Supabase auth,
storage, and document lookups so tests run without external services.
"""

import json
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

# ---------------------------------------------------------------------------
# Helpers to build mock auth + storage
# ---------------------------------------------------------------------------

FAKE_USER_ID = "user-abc-123"
FAKE_SOURCE_UID = "abc123hash"
FAKE_SOURCE_LOCATOR = "uploads/abc123hash/test.docx"
FAKE_DOC_TITLE = "test"
FAKE_DOCX_BYTES = b"PK\x03\x04fakdocxcontent"  # minimal zip header
FAKE_JWT_SECRET = "test-jwt-secret-not-placeholder"


def _mock_auth_principal():
    """Return a mock AuthPrincipal for the test user."""
    from app.auth.principals import AuthPrincipal
    return AuthPrincipal(
        subject_type="user",
        subject_id=FAKE_USER_ID,
        roles=frozenset({"authenticated"}),
        auth_source="supabase_jwt",
        email="test@example.com",
    )


def _mock_settings(monkeypatch):
    """Set env vars for a working bridge config."""
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key")
    monkeypatch.setenv("ONLYOFFICE_JWT_SECRET", FAKE_JWT_SECRET)
    monkeypatch.setenv("ONLYOFFICE_BRIDGE_URL", "http://host.docker.internal:8000")
    monkeypatch.setenv("ONLYOFFICE_DOCSERVER_URL", "http://localhost:9980")
    monkeypatch.setenv("ONLYOFFICE_DOCSERVER_INTERNAL_URL", "http://localhost:9980")
    monkeypatch.setenv("ONLYOFFICE_STORAGE_DIR", "/tmp/onlyoffice-test-cache")

    from app.core.config import get_settings
    get_settings.cache_clear()


def _mock_supabase_query(data):
    """Return a mock supabase client whose .table().select()...execute() returns data."""
    mock_result = MagicMock()
    mock_result.data = data

    mock_chain = MagicMock()
    mock_chain.select.return_value = mock_chain
    mock_chain.eq.return_value = mock_chain
    mock_chain.limit.return_value = mock_chain
    mock_chain.execute.return_value = mock_result

    mock_sb = MagicMock()
    mock_sb.table.return_value = mock_chain
    return mock_sb


# ---------------------------------------------------------------------------
# /open tests
# ---------------------------------------------------------------------------

class TestOpenEndpoint:
    def test_open_returns_session(self, client, monkeypatch, tmp_path):
        _mock_settings(monkeypatch)
        monkeypatch.setenv("ONLYOFFICE_STORAGE_DIR", str(tmp_path))

        from app.core.config import get_settings
        get_settings.cache_clear()

        doc_row = {
            "source_uid": FAKE_SOURCE_UID,
            "source_locator": FAKE_SOURCE_LOCATOR,
            "doc_title": FAKE_DOC_TITLE,
            "owner_id": FAKE_USER_ID,
        }

        with patch("app.api.routes.onlyoffice.require_auth", return_value=_mock_auth_principal()), \
             patch("app.api.routes.onlyoffice.get_supabase_admin", return_value=_mock_supabase_query([doc_row])), \
             patch("app.api.routes.onlyoffice.download_from_storage", new_callable=AsyncMock, return_value=FAKE_DOCX_BYTES):

            resp = client.post("/onlyoffice/open",
                json={"source_uid": FAKE_SOURCE_UID},
                headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200
            body = resp.json()
            assert "session_id" in body
            assert body["filename"] == "test.docx"

    def test_open_rejects_non_docx(self, client, monkeypatch, tmp_path):
        _mock_settings(monkeypatch)
        monkeypatch.setenv("ONLYOFFICE_STORAGE_DIR", str(tmp_path))

        from app.core.config import get_settings
        get_settings.cache_clear()

        doc_row = {
            "source_uid": FAKE_SOURCE_UID,
            "source_locator": "uploads/abc/sheet.xlsx",
            "doc_title": "sheet",
            "owner_id": FAKE_USER_ID,
        }

        with patch("app.api.routes.onlyoffice.require_auth", return_value=_mock_auth_principal()), \
             patch("app.api.routes.onlyoffice.get_supabase_admin", return_value=_mock_supabase_query([doc_row])):

            resp = client.post("/onlyoffice/open",
                json={"source_uid": FAKE_SOURCE_UID},
                headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 400

    def test_open_rejects_wrong_owner(self, client, monkeypatch, tmp_path):
        _mock_settings(monkeypatch)
        monkeypatch.setenv("ONLYOFFICE_STORAGE_DIR", str(tmp_path))

        from app.core.config import get_settings
        get_settings.cache_clear()

        doc_row = {
            "source_uid": FAKE_SOURCE_UID,
            "source_locator": FAKE_SOURCE_LOCATOR,
            "doc_title": FAKE_DOC_TITLE,
            "owner_id": "different-user-id",
        }

        with patch("app.api.routes.onlyoffice.require_auth", return_value=_mock_auth_principal()), \
             patch("app.api.routes.onlyoffice.get_supabase_admin", return_value=_mock_supabase_query([doc_row])):

            resp = client.post("/onlyoffice/open",
                json={"source_uid": FAKE_SOURCE_UID},
                headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 403

    def test_open_returns_404_for_missing_doc(self, client, monkeypatch, tmp_path):
        _mock_settings(monkeypatch)

        with patch("app.api.routes.onlyoffice.require_auth", return_value=_mock_auth_principal()), \
             patch("app.api.routes.onlyoffice.get_supabase_admin", return_value=_mock_supabase_query([])):

            resp = client.post("/onlyoffice/open",
                json={"source_uid": "nonexistent"},
                headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 404

    def test_open_returns_503_with_placeholder_secret(self, client, monkeypatch, tmp_path):
        _mock_settings(monkeypatch)
        monkeypatch.setenv("ONLYOFFICE_JWT_SECRET", "")

        from app.core.config import get_settings
        get_settings.cache_clear()

        with patch("app.api.routes.onlyoffice.require_auth", return_value=_mock_auth_principal()):
            resp = client.post("/onlyoffice/open",
                json={"source_uid": FAKE_SOURCE_UID},
                headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 503


# ---------------------------------------------------------------------------
# /config tests
# ---------------------------------------------------------------------------

class TestConfigEndpoint:
    def _create_session(self, client, monkeypatch, tmp_path):
        """Helper: open a session and return the session_id."""
        monkeypatch.setenv("ONLYOFFICE_STORAGE_DIR", str(tmp_path))

        from app.core.config import get_settings
        get_settings.cache_clear()

        doc_row = {
            "source_uid": FAKE_SOURCE_UID,
            "source_locator": FAKE_SOURCE_LOCATOR,
            "doc_title": FAKE_DOC_TITLE,
            "owner_id": FAKE_USER_ID,
        }

        with patch("app.api.routes.onlyoffice.require_auth", return_value=_mock_auth_principal()), \
             patch("app.api.routes.onlyoffice.get_supabase_admin", return_value=_mock_supabase_query([doc_row])), \
             patch("app.api.routes.onlyoffice.download_from_storage", new_callable=AsyncMock, return_value=FAKE_DOCX_BYTES):

            resp = client.post("/onlyoffice/open",
                json={"source_uid": FAKE_SOURCE_UID},
                headers={"Authorization": "Bearer fake"})
            return resp.json()["session_id"]

    def test_config_returns_signed_payload(self, client, monkeypatch, tmp_path):
        _mock_settings(monkeypatch)
        session_id = self._create_session(client, monkeypatch, tmp_path)

        with patch("app.api.routes.onlyoffice.require_auth", return_value=_mock_auth_principal()):
            resp = client.post("/onlyoffice/config",
                json={"session_id": session_id},
                headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200
            body = resp.json()
            assert "document" in body
            assert "editorConfig" in body
            assert "token" in body
            assert "host.docker.internal:8000" in body["document"]["url"]
            assert "host.docker.internal:8000" in body["editorConfig"]["callbackUrl"]
            assert body["document"]["fileType"] == "docx"

    def test_config_rejects_wrong_owner(self, client, monkeypatch, tmp_path):
        _mock_settings(monkeypatch)
        session_id = self._create_session(client, monkeypatch, tmp_path)

        from app.auth.principals import AuthPrincipal
        other_user = AuthPrincipal(
            subject_type="user",
            subject_id="other-user-id",
            roles=frozenset({"authenticated"}),
            auth_source="supabase_jwt",
        )

        with patch("app.api.routes.onlyoffice.require_auth", return_value=other_user):
            resp = client.post("/onlyoffice/config",
                json={"session_id": session_id},
                headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 403

    def test_config_rejects_invalid_session(self, client, monkeypatch):
        _mock_settings(monkeypatch)

        with patch("app.api.routes.onlyoffice.require_auth", return_value=_mock_auth_principal()):
            resp = client.post("/onlyoffice/config",
                json={"session_id": "nonexistent"},
                headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 404


# ---------------------------------------------------------------------------
# /doc tests (per-session token auth)
# ---------------------------------------------------------------------------

class TestDocEndpoint:
    def test_doc_serves_file_with_valid_token(self, client, monkeypatch, tmp_path):
        _mock_settings(monkeypatch)
        session_id = TestConfigEndpoint()._create_session(client, monkeypatch, tmp_path)

        # Generate a valid session token
        from app.api.routes.onlyoffice import _sign_session_token
        token = _sign_session_token(session_id)

        resp = client.get(f"/onlyoffice/doc/{session_id}?token={token}")
        assert resp.status_code == 200
        assert resp.content == FAKE_DOCX_BYTES

    def test_doc_rejects_wrong_session_token(self, client, monkeypatch, tmp_path):
        _mock_settings(monkeypatch)
        session_id = TestConfigEndpoint()._create_session(client, monkeypatch, tmp_path)

        # Token for a different session
        from app.api.routes.onlyoffice import _sign_session_token
        token = _sign_session_token("other-session-id")

        resp = client.get(f"/onlyoffice/doc/{session_id}?token={token}")
        assert resp.status_code == 401

    def test_doc_rejects_missing_token(self, client, monkeypatch):
        _mock_settings(monkeypatch)

        resp = client.get("/onlyoffice/doc/some-session")
        assert resp.status_code == 422  # FastAPI validation: token is required query param


# ---------------------------------------------------------------------------
# /callback tests (SSRF protection)
# ---------------------------------------------------------------------------

class TestCallbackEndpoint:
    def test_callback_rejects_untrusted_origin(self, client, monkeypatch, tmp_path):
        """Callback with download URL pointing to non-docserver origin is blocked."""
        _mock_settings(monkeypatch)
        session_id = TestConfigEndpoint()._create_session(client, monkeypatch, tmp_path)

        from app.api.routes.onlyoffice import _sign_session_token
        token = _sign_session_token(session_id)

        # Status 2 = ready for saving, but URL points to an untrusted host
        resp = client.post(
            f"/onlyoffice/callback/{session_id}?token={token}",
            json={"status": 2, "url": "http://evil.example.com/malicious.docx"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["error"] == 1  # OO protocol: error=1 means rejected

    def test_callback_rejects_wrong_port(self, client, monkeypatch, tmp_path):
        """Callback with correct hostname but wrong port is blocked (port-based SSRF)."""
        _mock_settings(monkeypatch)
        session_id = TestConfigEndpoint()._create_session(client, monkeypatch, tmp_path)

        from app.api.routes.onlyoffice import _sign_session_token
        token = _sign_session_token(session_id)

        resp = client.post(
            f"/onlyoffice/callback/{session_id}?token={token}",
            json={"status": 2, "url": "http://localhost:6379/dump.rdb"},
        )
        assert resp.status_code == 200
        assert resp.json()["error"] == 1

    def test_callback_rejects_non_http_scheme(self, client, monkeypatch, tmp_path):
        """Callback with file:// or other non-http scheme is blocked."""
        _mock_settings(monkeypatch)
        session_id = TestConfigEndpoint()._create_session(client, monkeypatch, tmp_path)

        from app.api.routes.onlyoffice import _sign_session_token
        token = _sign_session_token(session_id)

        resp = client.post(
            f"/onlyoffice/callback/{session_id}?token={token}",
            json={"status": 2, "url": "file:///etc/passwd"},
        )
        assert resp.status_code == 200
        assert resp.json()["error"] == 1

    def test_callback_ignores_non_save_status(self, client, monkeypatch, tmp_path):
        """Callback with status != 2 or 6 is acknowledged without saving."""
        _mock_settings(monkeypatch)
        session_id = TestConfigEndpoint()._create_session(client, monkeypatch, tmp_path)

        from app.api.routes.onlyoffice import _sign_session_token
        token = _sign_session_token(session_id)

        # Status 1 = editing, no save needed
        resp = client.post(
            f"/onlyoffice/callback/{session_id}?token={token}",
            json={"status": 1},
        )
        assert resp.status_code == 200
        assert resp.json()["error"] == 0
```

**Step 3: Run the tests to verify they fail**

Run:
```bash
cd /home/jon/BD2/services/platform-api && python -m pytest tests/test_onlyoffice.py -v
```

Expected: Tests should fail because the `require_auth` dependency patching needs to match the actual import path. If there are import errors, fix them before proceeding.

**Step 4: Run the tests to verify they pass**

Run:
```bash
cd /home/jon/BD2/services/platform-api && python -m pytest tests/test_onlyoffice.py -v
```

Expected: All tests PASS.

**Step 5: Run the full test suite to verify nothing hangs**

Run (with timeout):
```bash
cd /home/jon/BD2/services/platform-api && timeout 60 python -m pytest tests/ -v
```

Expected: All tests pass and pytest exits cleanly within 60 seconds. The `test_auth.py` tests still use bare `TestClient(app)` — they work but should be migrated to the shared fixture over time. That migration is out of scope for this plan.

**Step 6: Commit**

```bash
git add services/platform-api/tests/conftest.py services/platform-api/tests/test_onlyoffice.py
git commit -m "test(onlyoffice): add route-level bridge tests with proper client lifecycle"
```

---

## Task 7: Tighten the DOCX gate to also check source_type

**Files:**
- Modify: `services/platform-api/app/api/routes/onlyoffice.py:142-174`
- Modify: `services/platform-api/tests/test_onlyoffice.py`

**Why:** The current gate only checks `source_locator.endswith(".docx")`. Adding a `source_type` check makes the gate more robust — a document with `source_type='docx'` but a mangled locator still passes, and vice versa. This does NOT expand to other Word formats (docm, dotx, dotm) because the bridge hardcodes `fileType: "docx"` at `onlyoffice.py:239` and serves all files with the DOCX MIME type at `onlyoffice.py:285`. Widening format support would require changing the config payload, content-type handling, and MIME detection — that is a separate task.

**Step 1: Add the helper function test**

Append to `services/platform-api/tests/test_onlyoffice.py`:

```python
# ---------------------------------------------------------------------------
# _is_docx helper tests
# ---------------------------------------------------------------------------

class TestIsDocx:
    @pytest.mark.parametrize(
        "source_type,source_locator,expected",
        [
            # Both match
            ("docx", "uploads/abc/file.docx", True),
            # source_type alone
            ("docx", "uploads/abc/file", True),
            # Extension alone
            ("pdf", "uploads/abc/file.docx", True),
            # Neither matches
            ("pdf", "uploads/abc/file.pdf", False),
            ("xlsx", "uploads/abc/sheet.xlsx", False),
            # Case insensitive
            ("DOCX", "uploads/abc/file.DOCX", True),
            ("Docx", "uploads/abc/file.Docx", True),
            # Empty/missing
            ("", "uploads/abc/file.docx", True),
            ("docx", "", True),
            ("", "", False),
            ("pdf", "", False),
            # NOT expanded: docm, dotx, dotm are rejected because the bridge
            # hardcodes fileType: "docx" and DOCX MIME handling.
            ("docm", "uploads/abc/file.docm", False),
            ("dotx", "uploads/abc/template.dotx", False),
        ],
    )
    def test_is_docx(self, source_type, source_locator, expected):
        from app.api.routes.onlyoffice import _is_docx
        assert _is_docx(source_type, source_locator) == expected
```

**Step 2: Run the test to verify it fails**

Run:
```bash
cd /home/jon/BD2/services/platform-api && python -m pytest tests/test_onlyoffice.py::TestIsDocx -v
```

Expected: `ImportError: cannot import name '_is_docx'`

**Step 3: Implement _is_docx**

In `services/platform-api/app/api/routes/onlyoffice.py`, add after line 51 (`_PLACEHOLDER_SECRETS = ...`):

```python


def _is_docx(source_type: str, source_locator: str) -> bool:
    """Check if a document is a .docx file via source_type or extension.

    Only accepts 'docx' — not docm, dotx, dotm — because the bridge
    hardcodes fileType: "docx" and serves all cached files with the DOCX
    content type. Widening to other Word formats requires updating the
    config payload and MIME handling.
    """
    if source_type.lower() == "docx":
        return True
    ext = source_locator.rsplit(".", 1)[-1].lower() if "." in source_locator else ""
    return ext == "docx"
```

**Step 4: Update the DOCX gate in open_document**

Also update the select query (line 144) to include `source_type`:

Replace:
```python
        .select("source_uid, source_locator, doc_title, owner_id")
```

With:
```python
        .select("source_uid, source_locator, source_type, doc_title, owner_id")
```

Replace lines 165-174 (the current DOCX gate):

```python
    # Only DOCX files are supported — reject anything else before pulling
    # from storage, since the bridge hardcodes fileType: "docx" and serves
    # all cached files with the DOCX content type.
    # Gate on source_locator (immutable storage path), not doc_title which
    # the user can rename freely.
    if not source_locator.lower().endswith(".docx"):
        raise HTTPException(
            400,
            f"Only .docx files can be edited in OnlyOffice (got: {source_locator.split('/')[-1]})",
        )
```

With:

```python
    # Only .docx files are supported — reject anything else before pulling
    # from storage, since the bridge hardcodes fileType: "docx" and serves
    # all cached files with the DOCX content type.
    # Checks both source_type and source_locator extension for robustness.
    source_type = doc_row.get("source_type", "")
    if not _is_docx(source_type, source_locator):
        raise HTTPException(
            400,
            f"Only .docx files can be edited in OnlyOffice "
            f"(got type={source_type!r}, file={source_locator.split('/')[-1]!r})",
        )
```

**Step 5: Run all tests to verify they pass**

Run:
```bash
cd /home/jon/BD2/services/platform-api && timeout 60 python -m pytest tests/test_onlyoffice.py -v
```

Expected: All tests PASS, including the new `TestIsDocx` parametrized cases and the existing route-level tests (which mock `source_locator` as `.docx`).

**Step 6: Commit**

```bash
git add services/platform-api/app/api/routes/onlyoffice.py services/platform-api/tests/test_onlyoffice.py
git commit -m "feat(onlyoffice): tighten DOCX gate to check source_type + extension"
```

---

## Summary

| Task | Type | What |
|------|------|------|
| 1 | Bootstrap | Start Document Server containers |
| 2 | Bootstrap | Start bridge with `start-dev.sh` |
| 3 | Bootstrap | Verify Vite proxy |
| 4 | Verification | Curl smoke test: `/open`, `/config`, container fetch |
| 5 | Verification | Browser test: select DOCX → Edit → editor loads |
| 6 | Code hardening | Route-level tests for open/config/doc/callback + SSRF |
| 7 | Code hardening | DOCX gate checks `source_type` + extension (docx only) |