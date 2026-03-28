"""Tests for the product-owned OpenTelemetry contract module."""

from app.observability.contract import (
    CRYPTO_FALLBACK_COUNTER_NAME,
    SECRETS_CHANGE_COUNTER_NAME,
    SECRETS_CHANGED_LOG_EVENT,
    SECRETS_CREATE_SPAN_NAME,
    SECRETS_DELETE_SPAN_NAME,
    SECRETS_LIST_COUNTER_NAME,
    SECRETS_LIST_SPAN_NAME,
    SECRETS_UPDATE_SPAN_NAME,
    SENSITIVE_ATTRIBUTE_KEYS,
    STORAGE_METER_NAME,
    STORAGE_TRACER_NAME,
    safe_attributes,
)


# ── Canonical name constants ─────────────────────────────────────────


def test_metric_counter_names_are_frozen():
    assert SECRETS_LIST_COUNTER_NAME == "platform.secrets.list.count"
    assert SECRETS_CHANGE_COUNTER_NAME == "platform.secrets.change.count"
    assert CRYPTO_FALLBACK_COUNTER_NAME == "platform.crypto.fallback.count"


def test_log_event_names_are_frozen():
    assert SECRETS_CHANGED_LOG_EVENT == "secrets.changed"


def test_span_names_are_frozen():
    assert SECRETS_LIST_SPAN_NAME == "secrets.list"
    assert SECRETS_CREATE_SPAN_NAME == "secrets.create"
    assert SECRETS_UPDATE_SPAN_NAME == "secrets.update"
    assert SECRETS_DELETE_SPAN_NAME == "secrets.delete"


def test_storage_namespace_names_are_frozen():
    assert STORAGE_TRACER_NAME == "platform.storage"
    assert STORAGE_METER_NAME == "platform.storage"


# ── Sensitive attribute redaction ─────────────────────────────────────


def test_sensitive_keys_set():
    expected = {"authorization", "token", "jwt", "prompt", "body", "content", "secret"}
    assert SENSITIVE_ATTRIBUTE_KEYS == expected


def test_safe_attributes_removes_sensitive_keys():
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


def test_safe_attributes_case_insensitive():
    attrs = {"Authorization": "Bearer xyz", "TOKEN": "abc", "action": "list"}
    filtered = safe_attributes(attrs)
    assert "action" in filtered
    assert "Authorization" not in filtered
    assert "TOKEN" not in filtered


def test_safe_attributes_preserves_non_sensitive():
    attrs = {"action": "create", "result": "ok", "value_kind": "secret_type"}
    filtered = safe_attributes(attrs)
    assert filtered == attrs


def test_safe_attributes_empty_input():
    assert safe_attributes({}) == {}


# ── Re-export availability ────────────────────────────────────────────


def test_safe_attributes_importable_from_package():
    """safe_attributes is re-exported from app.observability for callers."""
    from app.observability import safe_attributes as sa
    assert callable(sa)


def test_safe_attributes_importable_from_otel_compat():
    """Backwards compat: safe_attributes still importable from otel.py."""
    from app.observability.otel import safe_attributes as sa
    assert callable(sa)
