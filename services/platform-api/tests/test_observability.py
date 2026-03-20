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
    assert "jaeger_ui_url" in status
