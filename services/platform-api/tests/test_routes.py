# services/platform-api/tests/test_routes.py
import pytest
from unittest.mock import MagicMock, patch
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


def test_convert_defaults_callback_url_to_platform_api_callback(client, monkeypatch):
    from app.api.routes import conversion as conversion_module

    callback_urls: list[str] = []

    async def fake_convert(_body):
        return (
            b"# Parsed\n",
            b'{"schema_name":"DoclingDocument"}',
            b"<p>Parsed</p>",
            b"<doctag>Parsed</doctag>",
            [{
                "block_type": "paragraph",
                "block_content": "Parsed",
                "pointer": "#/texts/0",
                "parser_block_type": "paragraph",
                "parser_path": "#/texts/0",
                "page_no": None,
                "page_nos": [],
            }],
        )

    async def fake_upload_bytes(*args, **kwargs):
        return None

    async def fake_send_callback(url, shared_secret, payload):
        callback_urls.append(url)

    monkeypatch.setenv("PLATFORM_API_URL", "http://localhost:8000")
    monkeypatch.setattr(conversion_module, "convert", fake_convert)
    monkeypatch.setattr(conversion_module, "upload_bytes", fake_upload_bytes)
    monkeypatch.setattr(conversion_module, "send_conversion_callback", fake_send_callback)

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
            "docling_output": {
                "bucket": "documents",
                "key": "out/file.docling.json",
                "signed_upload_url": "https://example.test/upload-docling",
            },
        },
        headers={"X-Conversion-Service-Key": "test-key"},
    )
    assert resp.status_code == 200
    assert callback_urls == ["http://localhost:8000/conversion/callback"]


def test_conversion_callback_route_exists(client, monkeypatch):
    from app.api.routes import conversion as conversion_module

    captured: list[tuple[str, str]] = []

    async def fake_finalize(body):
        captured.append((body.source_uid, body.docling_key or ""))
        return {
            "ok": True,
            "status": "parsed",
            "conv_uid": "conv-123",
            "blocks_count": 1,
            "track": "docling",
            "representation_types": ["doclingdocument_json", "markdown_bytes"],
        }

    monkeypatch.setattr(conversion_module, "finalize_docling_callback", fake_finalize)

    resp = client.post(
        "/conversion/callback",
        json={
            "source_uid": "src-1",
            "conversion_job_id": "job-1",
            "track": "docling",
            "md_key": "converted/src-1/file.md",
            "docling_key": "converted/src-1/file.docling.json",
            "success": True,
            "blocks": [{
                "block_type": "paragraph",
                "block_content": "Parsed",
                "pointer": "#/texts/0",
                "parser_block_type": "paragraph",
                "parser_path": "#/texts/0",
                "page_no": None,
                "page_nos": [],
            }],
        },
        headers={"X-Conversion-Service-Key": "test-key"},
    )
    assert resp.status_code == 200
    assert resp.json()["conv_uid"] == "conv-123"
    assert captured == [("src-1", "converted/src-1/file.docling.json")]

def test_api_v1_crews_stub(client):
    resp = client.get("/api/v1/crews")
    assert resp.status_code == 501


def test_api_v1_embeddings_stub(client):
    resp = client.get("/api/v1/embeddings")
    assert resp.status_code == 501


def test_api_v1_jobs_stub(client):
    resp = client.get("/api/v1/jobs")
    assert resp.status_code == 501


def test_health_with_otel_enabled(monkeypatch):
    """App starts and serves /health with OTEL_ENABLED=true."""
    monkeypatch.setenv("OTEL_ENABLED", "true")
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    from app.main import create_app
    app = create_app()
    with TestClient(app) as c:
        resp = c.get("/health")
        assert resp.status_code == 200

    get_settings.cache_clear()


def test_two_apps_with_otel_enabled(monkeypatch):
    """Two create_app() calls in one process with telemetry — no exception."""
    monkeypatch.setenv("OTEL_ENABLED", "true")
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    from app.main import create_app
    app1 = create_app()
    app2 = create_app()
    with TestClient(app1) as c1:
        assert c1.get("/health").status_code == 200
    with TestClient(app2) as c2:
        assert c2.get("/health").status_code == 200

    get_settings.cache_clear()


def test_app_skips_background_workers_without_supabase_admin_env(monkeypatch):
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    from app.core.config import get_settings
    get_settings.cache_clear()

    import app.main as main_module

    started: list[str] = []
    warnings: list[str] = []

    monkeypatch.setattr(main_module, "init_pool", lambda: MagicMock(status=lambda: "stubbed"))
    monkeypatch.setattr(main_module, "shutdown_pool", lambda: None)
    monkeypatch.setattr(main_module, "start_pipeline_jobs_worker", lambda: started.append("pipeline"))
    monkeypatch.setattr(main_module, "stop_pipeline_jobs_worker", lambda: None)
    monkeypatch.setattr(main_module, "start_storage_cleanup_worker", lambda: started.append("storage"))
    monkeypatch.setattr(main_module, "stop_storage_cleanup_worker", lambda: None)
    monkeypatch.setattr(main_module.logger, "warning", lambda message, *args, **kwargs: warnings.append(str(message)))

    app = main_module.create_app()
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200

    assert started == []
    assert "Skipping background workers because SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set" in warnings

    get_settings.cache_clear()
