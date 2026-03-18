"""Integration tests for POST /parse route."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from app.main import app
from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal

client = TestClient(app, raise_server_exceptions=False)
AUTH_HEADERS = {"Authorization": "Bearer test-token"}


def _mock_auth_principal():
    return AuthPrincipal(
        subject_type="user", subject_id="test-user",
        roles=frozenset({"authenticated"}), auth_source="supabase_jwt",
    )


@pytest.fixture(autouse=True)
def stub_auth():
    app.dependency_overrides[require_user_auth] = _mock_auth_principal
    yield
    app.dependency_overrides.clear()


# Patch get_supabase_admin at ALL import sites
SB_PATCHES = [
    "app.api.routes.parse.get_supabase_admin",
    "app.domain.conversion.repository.get_supabase_admin",
]


def _make_sb_mock(table_side_effect=None):
    """Create a supabase mock with optional table routing."""
    sb = MagicMock()
    if table_side_effect:
        sb.table.side_effect = table_side_effect
    return sb


def test_parse_route_exists():
    """POST /parse should not return 405 Method Not Allowed (route is registered)."""
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=None)
    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb):
        resp = client.post("/parse", json={"source_uid": "x"}, headers=AUTH_HEADERS)
    # 404 = doc not found (route works), 405 = route not registered
    assert resp.status_code != 405


def test_parse_rejects_missing_source_uid():
    """POST /parse requires source_uid."""
    resp = client.post("/parse", json={}, headers=AUTH_HEADERS)
    assert resp.status_code == 422


def test_parse_rejects_unknown_source():
    """POST /parse returns 404 if source_uid not found."""
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(data=None)
    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb):
        resp = client.post("/parse", json={"source_uid": "unknown"}, headers=AUTH_HEADERS)
    assert resp.status_code == 404


def test_parse_tree_sitter_java():
    """Full flow: lookup doc -> download -> parse -> upload -> DB write -> 200."""
    captured: dict[str, dict] = {}

    def table_side_effect(name):
        t = MagicMock()
        if name == "source_documents":
            doc_row = {"source_uid": "uid-1", "source_type": "java", "source_locator": "uploads/uid-1/Foo.java"}
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=doc_row)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            t.update.return_value.eq.return_value = write_chain
        elif name == "parsing_profiles":
            chain = MagicMock()
            chain.execute.return_value = MagicMock(data=None)
            t.select.return_value.eq.return_value.maybe_single.return_value = chain
        else:
            write_chain = MagicMock()
            write_chain.execute.return_value = MagicMock(data=[])
            def capture_upsert(row, *args, **kwargs):
                captured[name] = row
                return write_chain
            t.upsert.side_effect = capture_upsert
            t.update.return_value.eq.return_value = write_chain
        return t

    sb = _make_sb_mock(table_side_effect)

    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb), \
         patch("app.domain.conversion.repository.get_supabase_admin", return_value=sb), \
         patch("app.api.routes.parse.download_from_storage", new_callable=AsyncMock) as mock_download, \
         patch("app.api.routes.parse.upsert_to_storage", new_callable=AsyncMock) as mock_upload:

        mock_download.return_value = b"package demo; public class Foo { public String getName() { return null; } }"
        mock_upload.return_value = "https://storage/path"

        resp = client.post("/parse", json={"source_uid": "uid-1"}, headers=AUTH_HEADERS)

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert body.get("ok") is True
    assert body.get("track") == "tree_sitter"
    assert mock_upload.call_count == 2
    assert len(captured["conversion_parsing"]["conv_uid"]) == 64
    assert captured["conversion_parsing"]["conv_locator"] == "converted/uid-1/uid-1.ast.json"


def test_parse_rejects_docling_source_type():
    """POST /parse returns 400 for Docling-only formats."""
    def table_side_effect(name):
        t = MagicMock()
        doc_row = {"source_uid": "uid-pdf", "source_type": "pdf", "source_locator": "uploads/uid-pdf/doc.pdf"}
        chain = MagicMock()
        chain.execute.return_value = MagicMock(data=doc_row)
        t.select.return_value.eq.return_value.maybe_single.return_value = chain
        return t

    sb = _make_sb_mock(table_side_effect)

    with patch("app.api.routes.parse.get_supabase_admin", return_value=sb):
        resp = client.post("/parse", json={"source_uid": "uid-pdf"}, headers=AUTH_HEADERS)

    assert resp.status_code == 400
    assert "trigger-parse" in resp.json()["detail"]
