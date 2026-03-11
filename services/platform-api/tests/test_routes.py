# services/platform-api/tests/test_routes.py
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    from app.main import create_app
    app = create_app()
    with TestClient(app) as c:
        yield c

    get_settings.cache_clear()


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert "status" in resp.json()


def test_health_live(client):
    resp = client.get("/health/live")
    assert resp.status_code == 200


def test_health_ready(client):
    resp = client.get("/health/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert "status" in body
    # Readiness should reflect conversion pool state
    assert "conversion_pool" in body


def test_functions(client):
    resp = client.get("/functions")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_convert_rejects_no_auth(client):
    resp = client.post("/convert", json={})
    assert resp.status_code == 401


def test_citations_rejects_no_auth(client):
    resp = client.post("/citations", json={"text": "hello"})
    assert resp.status_code == 401


def test_convert_route_not_swallowed_by_plugin_catchall(client):
    """Ensure /convert is handled by conversion router, not /{function_name}."""
    resp = client.post("/convert", json={}, headers={"X-Conversion-Service-Key": "test-key"})
    # Should get 422 (validation error for missing fields), not 404 (no plugin)
    assert resp.status_code == 422


def test_unknown_plugin_returns_404(client):
    resp = client.post(
        "/nonexistent_plugin_xyz",
        json={"params": {}},
        headers={"X-Conversion-Service-Key": "test-key"},
    )
    assert resp.status_code == 404


def test_plugin_rejects_no_auth(client):
    """POST /{function_name} requires authentication."""
    resp = client.post("/core_log", json={"params": {"message": "test"}})
    assert resp.status_code == 401


def test_plugin_accepts_m2m_bearer(client):
    """POST /{function_name} accepts M2M bearer token."""
    resp = client.post(
        "/core_log",
        json={"params": {"message": "test"}},
        headers={"Authorization": "Bearer test-key"},
    )
    # Should succeed (200) or at least not 401/403
    assert resp.status_code == 200


def test_plugin_rejects_bad_token(client):
    """POST /{function_name} rejects invalid bearer token."""
    resp = client.post(
        "/core_log",
        json={"params": {"message": "test"}},
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert resp.status_code == 401


def test_convert_returns_503_when_pool_overloaded(client, monkeypatch):
    """POST /convert returns 503 with Retry-After when pool is at capacity."""
    from app.workers.conversion_pool import PoolOverloaded
    from unittest.mock import patch, MagicMock

    mock_pool_instance = MagicMock()
    mock_pool_instance.status.return_value = {
        "max_workers": 2,
        "max_queue_depth": 2,
        "active": 4,
        "saturated": True,
    }
    mock_pool_instance._max_workers = 2

    with patch("app.api.routes.conversion.get_conversion_pool", return_value=mock_pool_instance):
        resp = client.post(
            "/convert",
            json={
                "source_uid": "src-1",
                "conversion_job_id": "job-1",
                "track": "docling",
                "source_type": "pdf",
                "source_download_url": "https://example.test/file.pdf",
                "output": {
                    "bucket": "documents",
                    "key": "out/file.md",
                    "signed_upload_url": "https://example.test/upload",
                },
                "callback_url": "https://example.test/callback",
            },
            headers={"X-Conversion-Service-Key": "test-key"},
        )
        assert resp.status_code == 503
        assert "Retry-After" in resp.headers


def test_api_v1_crews_stub(client):
    resp = client.get("/api/v1/crews")
    assert resp.status_code == 501


def test_api_v1_embeddings_stub(client):
    resp = client.get("/api/v1/embeddings")
    assert resp.status_code == 501


def test_api_v1_jobs_stub(client):
    resp = client.get("/api/v1/jobs")
    assert resp.status_code == 501
