"""Tests for OpenTelemetry observability configuration and bootstrap."""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import FastAPI
from app.core.config import Settings, get_settings, _parse_otlp_headers
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


# --- OTLP header parsing tests ---


def test_otlp_headers_none_when_unset():
    assert _parse_otlp_headers(None) is None


def test_otlp_headers_none_when_empty():
    assert _parse_otlp_headers("") is None
    assert _parse_otlp_headers("   ") is None


def test_otlp_headers_parses_valid_pairs():
    result = _parse_otlp_headers("api-key=abc123,x-org=myorg")
    assert result == {"api-key": "abc123", "x-org": "myorg"}


def test_otlp_headers_trims_whitespace():
    result = _parse_otlp_headers("  api-key = abc123 , x-org = myorg  ")
    assert result == {"api-key": "abc123", "x-org": "myorg"}


def test_otlp_headers_allows_equals_in_value():
    result = _parse_otlp_headers("Authorization=Basic dXNlcjpwYXNz")
    assert result == {"Authorization": "Basic dXNlcjpwYXNz"}


def test_otlp_headers_rejects_missing_equals():
    with pytest.raises(ValueError, match="missing '='"):
        _parse_otlp_headers("api-key-without-value")


def test_otlp_headers_rejects_empty_key():
    with pytest.raises(ValueError, match="Empty key"):
        _parse_otlp_headers("=somevalue")


def test_otlp_headers_rejects_duplicate_key():
    with pytest.raises(ValueError, match="Duplicate key"):
        _parse_otlp_headers("api-key=abc,api-key=def")


def test_otlp_headers_loaded_from_env(monkeypatch):
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_HEADERS", "api-key=test123")
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.otel_exporter_otlp_headers == {"api-key": "test123"}
    get_settings.cache_clear()


def test_otlp_headers_default_none():
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.otel_exporter_otlp_headers is None
    get_settings.cache_clear()


def test_telemetry_status_does_not_expose_headers():
    settings = _make_settings(otel_enabled=True)
    status = get_telemetry_status(settings)
    assert "headers" not in str(status).lower()
    for key in status:
        assert "header" not in key.lower()


def test_protocol_http_protobuf_accepted():
    app = FastAPI()
    state = configure_telemetry(app, _make_settings(otel_enabled=True, otel_exporter_otlp_protocol="http/protobuf"))
    assert state["enabled"] is True


def test_protocol_grpc_rejected():
    app = FastAPI()
    with pytest.raises(ValueError, match="Unsupported OTEL_EXPORTER_OTLP_PROTOCOL"):
        configure_telemetry(app, _make_settings(otel_enabled=True, otel_exporter_otlp_protocol="grpc"))


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
        "signoz_ui_url": "http://localhost:8080",
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


def test_set_span_attributes_filters_sensitive_and_none():
    from unittest.mock import MagicMock

    from app.observability.contract import set_span_attributes

    span = MagicMock()
    set_span_attributes(
        span,
        {
            "plugin.name": "core_log",
            "authorization": "Bearer xyz",
            "missing": None,
            "latency_ms": 12,
        },
    )

    span.set_attribute.assert_any_call("plugin.name", "core_log")
    span.set_attribute.assert_any_call("latency_ms", 12)
    assert span.set_attribute.call_count == 2


def test_decrypt_with_context_warns_and_counts_plaintext_fallback():
    from app.infra.crypto import decrypt_with_context

    with patch("app.infra.crypto._logger") as mock_logger, patch(
        "app.infra.crypto._increment_plaintext_fallback_counter"
    ) as mock_counter:
        plaintext = decrypt_with_context("plain-secret", "unused-secret", "user-variables-v1")

    assert plaintext == "plain-secret"
    mock_logger.warning.assert_called_once_with("crypto.plaintext_passthrough")
    mock_counter.assert_called_once()


def test_plaintext_fallback_counter_uses_contract_name(monkeypatch):
    import app.infra.crypto as crypto
    import app.observability.contract as contract
    from opentelemetry import metrics as otel_metrics

    meter = MagicMock()
    monkeypatch.setattr(contract, "CRYPTO_PLAINTEXT_FALLBACK_COUNTER_NAME", "test.plaintext.counter")
    monkeypatch.setattr(otel_metrics, "get_meter", lambda _name: meter)
    crypto._plaintext_fallback_counter = None

    crypto._increment_plaintext_fallback_counter()

    meter.create_counter.assert_called_once()
    assert meter.create_counter.call_args.args[0] == "test.plaintext.counter"
    crypto._plaintext_fallback_counter = None


def test_decrypt_with_fallback_logs_primary_failure_before_legacy_success(monkeypatch):
    from app.infra.crypto import decrypt_with_fallback

    monkeypatch.setenv("APP_SECRET_ENVELOPE_KEY", "primary-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "legacy-key")

    with patch("app.infra.crypto.decrypt_with_context") as mock_decrypt, patch(
        "app.infra.crypto._logger"
    ) as mock_logger, patch("app.infra.crypto._increment_fallback_counter") as mock_counter:
        mock_decrypt.side_effect = [RuntimeError("primary broke"), "plaintext"]

        plaintext = decrypt_with_fallback("enc:v1:abc:def", "provider-connections-v1")

    assert plaintext == "plaintext"
    mock_logger.warning.assert_called_once_with(
        "crypto.decrypt_failed key_source=%s exc_type=%s",
        "primary",
        "RuntimeError",
    )
    mock_counter.assert_called_once()


def test_unknown_sampler_logs_warning_before_fallback():
    from app.observability.otel import _build_sampler
    from opentelemetry.sdk.trace.sampling import ALWAYS_ON

    with patch("app.observability.otel.logger") as mock_logger:
        sampler = _build_sampler("mystery", 1.0)

    assert sampler is ALWAYS_ON
    mock_logger.warning.assert_called_once_with("otel.unknown_sampler %s", "mystery")


def test_storage_metrics_use_contract_names(monkeypatch):
    import importlib

    import app.observability.contract as contract
    import app.observability.storage_metrics as storage_metrics
    from opentelemetry import metrics as otel_metrics

    meter = MagicMock()
    monkeypatch.setattr(otel_metrics, "get_meter", lambda _name: meter)

    monkeypatch.setattr(contract, "STORAGE_QUOTA_READ_COUNTER_NAME", "test.storage.quota.read.count")
    monkeypatch.setattr(contract, "STORAGE_UPLOAD_RESERVE_COUNTER_NAME", "test.storage.upload.reserve.count")
    monkeypatch.setattr(contract, "STORAGE_UPLOAD_RESERVE_FAILURE_COUNTER_NAME", "test.storage.upload.reserve.failure.count")
    monkeypatch.setattr(contract, "STORAGE_UPLOAD_COMPLETE_COUNTER_NAME", "test.storage.upload.complete.count")
    monkeypatch.setattr(contract, "STORAGE_UPLOAD_COMPLETE_FAILURE_COUNTER_NAME", "test.storage.upload.complete.failure.count")
    monkeypatch.setattr(contract, "STORAGE_UPLOAD_CANCEL_COUNTER_NAME", "test.storage.upload.cancel.count")
    monkeypatch.setattr(contract, "STORAGE_OBJECT_DELETE_COUNTER_NAME", "test.storage.object.delete.count")
    monkeypatch.setattr(contract, "STORAGE_QUOTA_EXCEEDED_COUNTER_NAME", "test.storage.quota.exceeded.count")
    monkeypatch.setattr(contract, "ADMIN_STORAGE_POLICY_UPDATE_COUNTER_NAME", "test.admin.storage.policy.update.count")
    monkeypatch.setattr(contract, "ADMIN_STORAGE_PROVISIONING_INCOMPLETE_COUNTER_NAME", "test.admin.storage.provisioning.incomplete.count")
    monkeypatch.setattr(contract, "STORAGE_UPLOAD_RESERVE_DURATION_MS_HISTOGRAM_NAME", "test.storage.upload.reserve.duration.ms")
    monkeypatch.setattr(contract, "STORAGE_UPLOAD_COMPLETE_DURATION_MS_HISTOGRAM_NAME", "test.storage.upload.complete.duration.ms")
    monkeypatch.setattr(contract, "ADMIN_STORAGE_POLICY_DURATION_MS_HISTOGRAM_NAME", "test.admin.storage.policy.duration.ms")
    monkeypatch.setattr(contract, "ADMIN_STORAGE_PROVISIONING_QUERY_DURATION_MS_HISTOGRAM_NAME", "test.admin.storage.provisioning.query.duration.ms")

    reloaded = importlib.reload(storage_metrics)

    counter_names = [call.args[0] for call in meter.create_counter.call_args_list]
    histogram_names = [call.args[0] for call in meter.create_histogram.call_args_list]

    assert "test.storage.quota.read.count" in counter_names
    assert "test.storage.upload.reserve.count" in counter_names
    assert "test.storage.upload.complete.count" in counter_names
    assert "test.admin.storage.policy.update.count" in counter_names
    assert "test.storage.upload.reserve.duration.ms" in histogram_names
    assert "test.admin.storage.provisioning.query.duration.ms" in histogram_names

    importlib.reload(reloaded)


def test_get_telemetry_status_shape():
    settings = _make_settings(otel_enabled=True)
    status = get_telemetry_status(settings)
    assert status["enabled"] is True
    assert status["service_name"] == "test-svc"
    assert status["otlp_endpoint"] == "http://localhost:4318"
    assert status["metrics_enabled"] is True
    assert status["logs_enabled"] is True
    assert status["signoz_ui_url"] == "http://localhost:8080"
    assert status["jaeger_ui_url"] == "http://localhost:16686"
    assert "signoz_ui_url" in status
    assert "jaeger_ui_url" in status


def test_telemetry_status_returns_signoz_ui_url_and_deprecated_alias():
    status = get_telemetry_status(
        _make_settings(
            otel_enabled=True,
            signoz_ui_url="http://localhost:8080",
            jaeger_ui_url="http://localhost:16686",
        )
    )
    assert status["signoz_ui_url"] == "http://localhost:8080"
    assert status["jaeger_ui_url"] == "http://localhost:16686"


def test_runtime_readiness_metrics_register_action_observability_contract(monkeypatch):
    import importlib

    import app.observability.runtime_readiness_metrics as runtime_readiness_metrics
    from opentelemetry import metrics as otel_metrics

    meter = MagicMock()
    monkeypatch.setattr(otel_metrics, "get_meter", lambda _name: meter)

    reloaded = importlib.reload(runtime_readiness_metrics)

    counter_names = [call.args[0] for call in meter.create_counter.call_args_list]
    histogram_names = [call.args[0] for call in meter.create_histogram.call_args_list]

    assert "runtime_readiness_actions_total" in counter_names
    assert "runtime_probes_total" in counter_names
    assert "runtime_readiness_action_duration_ms" in histogram_names
    assert "runtime_probe_duration_ms" in histogram_names

    importlib.reload(reloaded)


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
        assert "signoz_ui_url" in body
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
