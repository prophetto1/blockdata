"""Tests for OpenTelemetry observability configuration and bootstrap."""

from fastapi import FastAPI
from app.core.config import Settings, get_settings
from app.observability import configure_telemetry, shutdown_telemetry, get_telemetry_status
from app.observability.otel import safe_attributes


# --- Task 2: Config tests ---


def test_otel_settings_load_from_env(monkeypatch):
    monkeypatch.setenv("OTEL_ENABLED", "true")
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://collector:4318")
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.otel_enabled is True
    assert settings.otel_exporter_otlp_endpoint == "http://collector:4318"
    get_settings.cache_clear()


def test_otel_enabled_defaults_false():
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.otel_enabled is False
    get_settings.cache_clear()


def test_otel_log_correlation_defaults_true():
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.otel_log_correlation is True
    get_settings.cache_clear()


def test_otel_log_correlation_override(monkeypatch):
    monkeypatch.setenv("OTEL_LOG_CORRELATION", "false")
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.otel_log_correlation is False
    get_settings.cache_clear()


def test_otel_signal_exports_parse_env_flags(monkeypatch):
    monkeypatch.setenv("OTEL_METRICS_ENABLED", "false")
    monkeypatch.setenv("OTEL_LOGS_ENABLED", "false")
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.otel_metrics_enabled is False
    assert settings.otel_logs_enabled is False
    get_settings.cache_clear()


# --- Task 3: Bootstrap tests ---


def _make_settings(**overrides) -> Settings:
    defaults = {
        "otel_enabled": False,
        "otel_service_name": "test-svc",
        "otel_service_namespace": "test-ns",
        "otel_deployment_env": "test",
        "otel_exporter_otlp_endpoint": "http://localhost:4318",
        "otel_exporter_otlp_protocol": "http/protobuf",
        "otel_traces_sampler": "parentbased_traceidratio",
        "otel_traces_sampler_arg": 1.0,
        "otel_log_correlation": True,
        "otel_metrics_enabled": True,
        "otel_logs_enabled": True,
        "jaeger_ui_url": "http://localhost:16686",
    }
    defaults.update(overrides)
    return Settings(**defaults)


def test_configure_disabled_returns_noop():
    app = FastAPI()
    state = configure_telemetry(app, _make_settings(otel_enabled=False))
    assert state["enabled"] is False


def test_configure_enabled_returns_state():
    app = FastAPI()
    state = configure_telemetry(app, _make_settings(otel_enabled=True))
    assert state["enabled"] is True
    assert state["provider"] is not None


def test_configure_repeated_calls_safe():
    """Two apps in one process with telemetry enabled — no exception."""
    app1 = FastAPI()
    app2 = FastAPI()
    settings = _make_settings(otel_enabled=True)
    state1 = configure_telemetry(app1, settings)
    state2 = configure_telemetry(app2, settings)
    assert state1["enabled"] is True
    assert state2["enabled"] is True


def test_shutdown_noop_when_disabled():
    """shutdown_telemetry on disabled state does nothing."""
    shutdown_telemetry({"enabled": False})
    shutdown_telemetry({})
    shutdown_telemetry(None)


def test_shutdown_flushes_when_enabled():
    app = FastAPI()
    state = configure_telemetry(app, _make_settings(otel_enabled=True))
    # Should not raise
    shutdown_telemetry(state)


def test_safe_attributes_filters_sensitive():
    attrs = {
        "plugin.name": "core_log",
        "authorization": "Bearer xyz",
        "token": "abc",
        "error.type": "ValueError",
    }
    filtered = safe_attributes(attrs)
    assert "plugin.name" in filtered
    assert "error.type" in filtered
    assert "authorization" not in filtered
    assert "token" not in filtered


def test_get_telemetry_status_shape():
    settings = _make_settings(otel_enabled=True)
    status = get_telemetry_status(settings)
    assert status["enabled"] is True
    assert status["service_name"] == "test-svc"
    assert status["otlp_endpoint"] == "http://localhost:4318"
    assert status["metrics_enabled"] is True
    assert status["logs_enabled"] is True
    assert "jaeger_ui_url" in status


# --- Task 5: Manual span tests ---


def test_plugin_execute_creates_span(monkeypatch):
    """Plugin execution route creates a 'plugin.execute' span with attributes."""
    from unittest.mock import MagicMock, patch

    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")
    get_settings.cache_clear()

    mock_span = MagicMock()
    mock_cm = MagicMock()
    mock_cm.__enter__ = MagicMock(return_value=mock_span)
    mock_cm.__exit__ = MagicMock(return_value=False)
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value = mock_cm

    from app.main import create_app
    app = create_app()

    with patch("app.api.routes.plugin_execution.tracer", mock_tracer):
        from fastapi.testclient import TestClient
        with TestClient(app) as c:
            resp = c.post(
                "/core_log",
                json={"params": {"message": "test"}},
                headers={"Authorization": "Bearer test-key"},
            )
            assert resp.status_code == 200

    mock_tracer.start_as_current_span.assert_called_with("plugin.execute")
    mock_span.set_attribute.assert_any_call("plugin.name", "core_log")
    mock_span.set_attribute.assert_any_call("plugin.result_state", "SUCCESS")
    get_settings.cache_clear()


# --- Task 6: Telemetry status endpoint tests ---


def test_telemetry_status_rejects_no_auth(monkeypatch):
    """GET /observability/telemetry-status without auth returns 401."""
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")
    get_settings.cache_clear()

    from app.main import create_app
    from fastapi.testclient import TestClient
    app = create_app()
    with TestClient(app) as c:
        resp = c.get("/observability/telemetry-status")
        assert resp.status_code == 401
    get_settings.cache_clear()


def test_telemetry_status_returns_shape_for_superuser(monkeypatch):
    """Superuser (M2M bearer) gets 200 with expected payload shape."""
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")
    get_settings.cache_clear()

    from app.main import create_app
    from fastapi.testclient import TestClient
    app = create_app()
    with TestClient(app) as c:
        resp = c.get(
            "/observability/telemetry-status",
            headers={"Authorization": "Bearer test-key"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "enabled" in body
        assert "service_name" in body
        assert "otlp_endpoint" in body
        assert "sampler" in body
        assert "log_correlation" in body
        assert "jaeger_ui_url" in body
    get_settings.cache_clear()


# --- Task 5: Manual span tests (continued) ---


def test_span_records_exception_on_plugin_error(monkeypatch):
    """Error path records exception metadata on the span safely."""
    from unittest.mock import MagicMock, patch, AsyncMock

    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "test-key")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-key")
    get_settings.cache_clear()

    mock_span = MagicMock()
    mock_cm = MagicMock()
    mock_cm.__enter__ = MagicMock(return_value=mock_span)
    mock_cm.__exit__ = MagicMock(return_value=False)
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value = mock_cm

    from app.main import create_app
    app = create_app()

    # Make the plugin raise an exception
    boom = ValueError("test boom")
    mock_plugin = MagicMock()
    mock_plugin.run = AsyncMock(side_effect=boom)

    with patch("app.api.routes.plugin_execution.tracer", mock_tracer), \
         patch("app.api.routes.plugin_execution.resolve_by_function_name", return_value="core_log"), \
         patch("app.api.routes.plugin_execution.resolve", return_value=mock_plugin):
        from fastapi.testclient import TestClient
        with TestClient(app) as c:
            resp = c.post(
                "/core_log",
                json={"params": {"message": "test"}},
                headers={"Authorization": "Bearer test-key"},
            )
            assert resp.status_code == 200  # Route catches and wraps as FAILED

    mock_span.record_exception.assert_called_once_with(boom)
    mock_span.set_attribute.assert_any_call("error.type", "ValueError")
    mock_span.set_attribute.assert_any_call("plugin.result_state", "FAILED")
    get_settings.cache_clear()
