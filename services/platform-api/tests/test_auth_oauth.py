import importlib
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import create_app


def _make_app(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "test-m2m-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-role")
    from app.core.config import get_settings
    import app.main as main_module

    get_settings.cache_clear()
    monkeypatch.setattr(main_module, "init_pool", lambda: MagicMock(status=lambda: "stubbed"))
    monkeypatch.setattr(main_module, "shutdown_pool", lambda: None)
    monkeypatch.setattr(main_module, "start_storage_cleanup_worker", lambda: None)
    monkeypatch.setattr(main_module, "stop_storage_cleanup_worker", lambda: None)
    return create_app()


def _make_span_cm():
    mock_span = MagicMock()
    mock_cm = MagicMock()
    mock_cm.__enter__ = MagicMock(return_value=mock_span)
    mock_cm.__exit__ = MagicMock(return_value=False)
    return mock_span, mock_cm


def test_create_oauth_attempt_rejects_invalid_provider(monkeypatch):
    app = _make_app(monkeypatch)

    with TestClient(app) as client:
        response = client.post(
            "/auth/oauth/attempts",
            json={
                "provider": "linkedin",
                "redirect_origin": "http://localhost:5374",
                "next_path": "/app",
            },
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_oauth_attempt_returns_payload_and_emits_started_observability():
    auth_oauth = importlib.import_module("app.api.routes.auth_oauth")

    captured_insert = {}
    mock_span, mock_cm = _make_span_cm()
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value = mock_cm
    mock_counter = MagicMock()
    mock_logger = MagicMock()

    auth_oauth.tracer = mock_tracer
    auth_oauth.oauth_attempts_counter = mock_counter
    auth_oauth.logger = mock_logger
    auth_oauth.get_supabase_admin = lambda: object()
    auth_oauth._generate_attempt_secret = lambda: "attempt-secret-123"
    auth_oauth._hash_attempt_secret = lambda value: f"hash:{value}"

    def _insert_attempt(_admin, payload):
        captured_insert.update(payload)
        return {
            "attempt_id": "attempt-1",
            "expires_at": "2026-03-21T20:30:00+00:00",
        }

    auth_oauth._insert_oauth_attempt = _insert_attempt

    result = await auth_oauth.create_oauth_attempt(
        auth_oauth.CreateOAuthAttemptRequest(
            provider="google",
            redirect_origin="http://localhost:5374",
            next_path="/auth/welcome",
        )
    )

    assert result == {
        "attempt_id": "attempt-1",
        "attempt_secret": "attempt-secret-123",
        "expires_at": "2026-03-21T20:30:00+00:00",
    }
    assert captured_insert["provider"] == "google"
    assert captured_insert["redirect_origin"] == "http://localhost:5374"
    assert captured_insert["next_path"] == "/auth/welcome"
    assert captured_insert["attempt_secret_hash"] == "hash:attempt-secret-123"
    mock_tracer.start_as_current_span.assert_called_with("auth.oauth.attempt.create")
    mock_counter.add.assert_called_once()
    mock_logger.info.assert_called_once()
    mock_span.set_attribute.assert_any_call("auth.provider", "google")


@pytest.mark.asyncio
async def test_record_oauth_attempt_event_rejects_invalid_secret():
    auth_oauth = importlib.import_module("app.api.routes.auth_oauth")

    auth_oauth.get_supabase_admin = lambda: object()
    auth_oauth._load_oauth_attempt = lambda *_args, **_kwargs: {
        "attempt_id": "attempt-1",
        "attempt_secret_hash": "hash:correct-secret",
        "status": "started",
        "created_at": "2026-03-21T20:00:00+00:00",
        "expires_at": "2026-03-21T20:30:00+00:00",
    }
    auth_oauth._verify_attempt_secret = lambda provided, expected_hash: False

    with pytest.raises(HTTPException) as exc:
        await auth_oauth.record_oauth_attempt_event(
            "attempt-1",
            auth_oauth.OAuthAttemptEventRequest(
                attempt_secret="wrong-secret",
                event="callback_received",
            ),
        )

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_record_oauth_attempt_event_rejects_expired_attempt():
    auth_oauth = importlib.import_module("app.api.routes.auth_oauth")

    auth_oauth.get_supabase_admin = lambda: object()
    auth_oauth._load_oauth_attempt = lambda *_args, **_kwargs: {
        "attempt_id": "attempt-1",
        "attempt_secret_hash": "hash:correct-secret",
        "status": "started",
        "created_at": "2026-03-21T20:00:00+00:00",
        "expires_at": "2026-03-21T20:01:00+00:00",
    }
    auth_oauth._verify_attempt_secret = lambda provided, expected_hash: True
    auth_oauth._is_attempt_expired = lambda row: True

    with pytest.raises(HTTPException) as exc:
        await auth_oauth.record_oauth_attempt_event(
            "attempt-1",
            auth_oauth.OAuthAttemptEventRequest(
                attempt_secret="correct-secret",
                event="callback_received",
            ),
        )

    assert exc.value.status_code == 410


@pytest.mark.asyncio
async def test_record_oauth_attempt_event_records_completion_and_duration():
    auth_oauth = importlib.import_module("app.api.routes.auth_oauth")

    captured_update = {}
    mock_span, mock_cm = _make_span_cm()
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value = mock_cm
    mock_histogram = MagicMock()
    mock_logger = MagicMock()

    auth_oauth.tracer = mock_tracer
    auth_oauth.oauth_attempt_duration_ms = mock_histogram
    auth_oauth.logger = mock_logger
    auth_oauth.get_supabase_admin = lambda: object()
    auth_oauth._load_oauth_attempt = lambda *_args, **_kwargs: {
        "attempt_id": "attempt-1",
        "provider": "google",
        "attempt_secret_hash": "hash:correct-secret",
        "status": "session_detected",
        "created_at": "2026-03-21T20:00:00+00:00",
        "expires_at": "2026-03-21T20:30:00+00:00",
    }
    auth_oauth._verify_attempt_secret = lambda provided, expected_hash: True
    auth_oauth._is_attempt_expired = lambda row: False

    def _update_attempt(_admin, attempt_id, updates):
        captured_update.update(updates)
        return {
            "attempt_id": attempt_id,
            "status": updates["status"],
        }

    auth_oauth._update_oauth_attempt = _update_attempt
    auth_oauth._calculate_duration_ms = lambda row: 1234

    result = await auth_oauth.record_oauth_attempt_event(
        "attempt-1",
        auth_oauth.OAuthAttemptEventRequest(
            attempt_secret="correct-secret",
            event="completed",
            result="welcome",
            profile_state="missing",
        ),
    )

    assert result == {"ok": True, "status": "completed"}
    assert captured_update["status"] == "completed"
    assert captured_update["result"] == "welcome"
    assert captured_update["profile_state"] == "missing"
    mock_tracer.start_as_current_span.assert_called_with("auth.oauth.attempt.event")
    mock_histogram.record.assert_called_once_with(1234, {"auth.provider": "google", "result": "welcome"})
    mock_logger.info.assert_called_once()


@pytest.mark.asyncio
async def test_record_oauth_attempt_event_records_failed_callback():
    auth_oauth = importlib.import_module("app.api.routes.auth_oauth")

    captured_update = {}
    mock_span, mock_cm = _make_span_cm()
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value = mock_cm
    mock_counter = MagicMock()
    mock_logger = MagicMock()

    auth_oauth.tracer = mock_tracer
    auth_oauth.oauth_failures_counter = mock_counter
    auth_oauth.logger = mock_logger
    auth_oauth.get_supabase_admin = lambda: object()
    auth_oauth._load_oauth_attempt = lambda *_args, **_kwargs: {
        "attempt_id": "attempt-1",
        "provider": "github",
        "attempt_secret_hash": "hash:correct-secret",
        "status": "callback_received",
        "created_at": "2026-03-21T20:00:00+00:00",
        "expires_at": "2026-03-21T20:30:00+00:00",
    }
    auth_oauth._verify_attempt_secret = lambda provided, expected_hash: True
    auth_oauth._is_attempt_expired = lambda row: False

    def _update_attempt(_admin, attempt_id, updates):
        captured_update.update(updates)
        return {
            "attempt_id": attempt_id,
            "status": updates["status"],
        }

    auth_oauth._update_oauth_attempt = _update_attempt

    result = await auth_oauth.record_oauth_attempt_event(
        "attempt-1",
        auth_oauth.OAuthAttemptEventRequest(
            attempt_secret="correct-secret",
            event="failed",
            result="login_error",
            failure_category="callback_error",
            callback_error_code="access_denied",
        ),
    )

    assert result == {"ok": True, "status": "failed"}
    assert captured_update["status"] == "failed"
    assert captured_update["result"] == "login_error"
    assert captured_update["failure_category"] == "callback_error"
    assert captured_update["callback_error_code"] == "access_denied"
    mock_tracer.start_as_current_span.assert_called_with("auth.oauth.attempt.event")
    mock_counter.add.assert_called_once_with(1, {"auth.provider": "github", "failure_category": "callback_error"})
    mock_logger.warning.assert_called_once()


def test_oauth_provider_status_rejects_unauthenticated(monkeypatch):
    app = _make_app(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/admin/auth/oauth/providers/status")

    assert response.status_code == 401


def test_oauth_provider_status_returns_shape_for_superuser(monkeypatch):
    app = _make_app(monkeypatch)
    monkeypatch.setenv("AUTH_REDIRECT_ORIGINS", "http://localhost:5374,http://127.0.0.1:5374")

    auth_oauth = importlib.import_module("app.api.routes.auth_oauth")
    auth_oauth._fetch_supabase_auth_config = lambda _settings: {
        "external_google_enabled": True,
        "external_github_enabled": False,
    }

    with TestClient(app) as client:
        response = client.get(
            "/admin/auth/oauth/providers/status",
            headers={"Authorization": "Bearer test-m2m-token"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "google_enabled": True,
        "github_enabled": False,
        "supabase_callback_url": "http://localhost:54321/auth/v1/callback",
        "expected_redirect_origins": [
            "http://localhost:5374",
            "http://127.0.0.1:5374",
        ],
        "checked_at": response.json()["checked_at"],
    }


def test_recent_oauth_attempts_rejects_unauthenticated(monkeypatch):
    app = _make_app(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/admin/auth/oauth/attempts/recent")

    assert response.status_code == 401


def test_recent_oauth_attempts_returns_rows_for_superuser(monkeypatch):
    app = _make_app(monkeypatch)

    auth_oauth = importlib.import_module("app.api.routes.auth_oauth")
    auth_oauth._list_recent_oauth_attempts = lambda _admin, limit: [
        {
            "attempt_id": "attempt-1",
            "provider": "google",
            "status": "completed",
            "result": "app",
            "failure_category": None,
            "redirect_origin": "http://localhost:5374",
            "created_at": "2026-03-21T20:00:00+00:00",
            "callback_received_at": "2026-03-21T20:00:03+00:00",
            "finalized_at": "2026-03-21T20:00:05+00:00",
            "duration_ms": 5000,
        }
    ]

    with TestClient(app) as client:
        response = client.get(
            "/admin/auth/oauth/attempts/recent?limit=10",
            headers={"Authorization": "Bearer test-m2m-token"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "attempts": [
            {
                "attempt_id": "attempt-1",
                "provider": "google",
                "status": "completed",
                "result": "app",
                "failure_category": None,
                "redirect_origin": "http://localhost:5374",
                "created_at": "2026-03-21T20:00:00+00:00",
                "callback_received_at": "2026-03-21T20:00:03+00:00",
                "finalized_at": "2026-03-21T20:00:05+00:00",
                "duration_ms": 5000,
            }
        ]
    }
