"""Smoke tests for the OnlyOffice bridge routes.

Mock targets match the infra modules the bridge imports:
- app.api.routes.onlyoffice.download_from_storage  (from app.infra.storage)
- app.api.routes.onlyoffice.upsert_to_storage      (from app.infra.storage)
- app.api.routes.onlyoffice.download_bytes          (from app.infra.http_client)
- app.api.routes.onlyoffice.get_supabase_admin      (from app.infra.supabase_client)
"""

import os
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

# Override settings before importing app — use a real secret (not the placeholder)
os.environ.setdefault("ONLYOFFICE_JWT_SECRET", "test-secret-not-placeholder")
os.environ.setdefault("ONLYOFFICE_DOCSERVER_URL", "http://docserver:9980")
os.environ.setdefault("ONLYOFFICE_DOCSERVER_INTERNAL_URL", "http://docserver:9980")
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")

from app.main import create_app

FAKE_DOCX = b"PK\x03\x04" + b"\x00" * 100
TEST_USER_ID = "test-user"

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
    from app.core.config import get_settings
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

    def test_open_rejects_non_docx(self, client, mock_supabase_admin):
        """Only .docx files can be opened for editing."""
        pdf_doc = {**FAKE_DOC_ROW, "doc_title": "report.pdf"}
        mock_execute = MagicMock()
        mock_execute.execute.return_value = MagicMock(data=[pdf_doc])
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.limit.return_value = mock_execute
        mock_supabase_admin.table.return_value = mock_query

        resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        assert resp.status_code == 400
        assert "docx" in resp.json()["detail"].lower()

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
        open_resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        session_id = open_resp.json()["session_id"]

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

        open_resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        session_id = open_resp.json()["session_id"]

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

        mock_download_bytes.assert_called_once_with(
            "http://docserver:9980/cache/files/output.docx"
        )

        mock_storage_upsert.assert_called_once()
        call_args = mock_storage_upsert.call_args
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

    def test_callback_rejects_wrong_scheme(self, client):
        """SSRF: correct host+port but different scheme must be rejected."""
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
                "url": "https://docserver:9980/cache/files/output.docx",
            },
        )
        assert resp.status_code == 200
        assert resp.json() == {"error": 1}

    def test_callback_rejects_wrong_port(self, client):
        """SSRF: correct hostname but different port must be rejected."""
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
                "url": "http://docserver:8080/cache/files/output.docx",
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
        assert resp.json() == {"error": 1}

    def test_callback_rejects_when_concurrency_check_fails(self, client, mock_storage_download):
        """If the concurrency verification read throws, save is rejected (fail closed)."""
        open_resp = client.post(
            "/onlyoffice/open",
            json={"source_uid": "abc123"},
        )
        session_id = open_resp.json()["session_id"]
        session_token = self._get_session_token(client, session_id)

        # Storage read fails
        mock_storage_download.side_effect = Exception("storage unavailable")

        resp = client.post(
            f"/onlyoffice/callback/{session_id}?token={session_token}",
            json={
                "status": 2,
                "url": "http://docserver:9980/cache/files/output.docx",
            },
        )
        assert resp.status_code == 200
        assert resp.json() == {"error": 1}


class TestPlaceholderSecretRejection:
    def test_open_rejects_placeholder_secret(self, tmp_cache, mock_supabase_admin, mock_storage_download):
        """The bridge must refuse to operate with the placeholder JWT secret."""
        from app.auth.dependencies import require_auth, AuthPrincipal
        from app.core.config import get_settings

        with patch.dict(os.environ, {"ONLYOFFICE_JWT_SECRET": "my-jwt-secret-change-me"}):
            get_settings.cache_clear()
            app = create_app()
            principal = AuthPrincipal(
                subject_type="user",
                subject_id=TEST_USER_ID,
                roles=frozenset({"authenticated"}),
                auth_source="test",
                email="test@example.com",
            )
            app.dependency_overrides[require_auth] = lambda: principal

            with TestClient(app) as c:
                resp = c.post("/onlyoffice/open", json={"source_uid": "abc123"})
                assert resp.status_code == 503

            app.dependency_overrides.clear()
        get_settings.cache_clear()
