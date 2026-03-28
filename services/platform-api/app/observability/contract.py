"""Product-owned OpenTelemetry contract: canonical names, redaction, and constants.

This module is the single source of truth for observable surface names
used by the in-scope auth/secrets, crypto, and storage foundation.
Application code imports constants from here rather than hardcoding
metric, span, or log-event name strings inline.
"""

from __future__ import annotations

from typing import Any

# ── Sensitive attribute redaction policy ──────────────────────────────

SENSITIVE_ATTRIBUTE_KEYS: frozenset[str] = frozenset({
    "authorization",
    "token",
    "jwt",
    "prompt",
    "body",
    "content",
    "secret",
})


def safe_attributes(attrs: dict[str, Any]) -> dict[str, Any]:
    """Return *attrs* with sensitive keys removed."""
    return {k: v for k, v in attrs.items() if k.lower() not in SENSITIVE_ATTRIBUTE_KEYS}


def set_span_attributes(span: Any, attrs: dict[str, Any]) -> None:
    """Set only safe, non-null attributes on *span*."""
    for key, value in safe_attributes(attrs).items():
        if value is not None:
            span.set_attribute(key, value)


# ── Canonical metric names (counters) ────────────────────────────────

SECRETS_LIST_COUNTER_NAME: str = "platform.secrets.list.count"
SECRETS_CHANGE_COUNTER_NAME: str = "platform.secrets.change.count"
CRYPTO_FALLBACK_COUNTER_NAME: str = "platform.crypto.fallback.count"
CRYPTO_PLAINTEXT_FALLBACK_COUNTER_NAME: str = "platform.crypto.plaintext_fallback.count"

# ── Canonical structured log event names ─────────────────────────────

SECRETS_CHANGED_LOG_EVENT: str = "secrets.changed"

# ── Canonical span names ─────────────────────────────────────────────

SECRETS_LIST_SPAN_NAME: str = "secrets.list"
SECRETS_CREATE_SPAN_NAME: str = "secrets.create"
SECRETS_UPDATE_SPAN_NAME: str = "secrets.update"
SECRETS_DELETE_SPAN_NAME: str = "secrets.delete"

# ── Storage meter/tracer identity ────────────────────────────────────
STORAGE_TRACER_NAME: str = "platform.storage"
STORAGE_METER_NAME: str = "platform.storage"
STORAGE_QUOTA_READ_COUNTER_NAME: str = "platform.storage.quota.read.count"
STORAGE_UPLOAD_RESERVE_COUNTER_NAME: str = "platform.storage.upload.reserve.count"
STORAGE_UPLOAD_RESERVE_FAILURE_COUNTER_NAME: str = "platform.storage.upload.reserve.failure.count"
STORAGE_UPLOAD_COMPLETE_COUNTER_NAME: str = "platform.storage.upload.complete.count"
STORAGE_UPLOAD_COMPLETE_FAILURE_COUNTER_NAME: str = "platform.storage.upload.complete.failure.count"
STORAGE_UPLOAD_CANCEL_COUNTER_NAME: str = "platform.storage.upload.cancel.count"
STORAGE_OBJECT_DELETE_COUNTER_NAME: str = "platform.storage.object.delete.count"
STORAGE_QUOTA_EXCEEDED_COUNTER_NAME: str = "platform.storage.quota.exceeded.count"
ADMIN_STORAGE_POLICY_UPDATE_COUNTER_NAME: str = "platform.admin.storage.policy.update.count"
ADMIN_STORAGE_PROVISIONING_INCOMPLETE_COUNTER_NAME: str = (
    "platform.admin.storage.provisioning.incomplete.count"
)
STORAGE_UPLOAD_RESERVE_DURATION_MS_HISTOGRAM_NAME: str = (
    "platform.storage.upload.reserve.duration.ms"
)
STORAGE_UPLOAD_COMPLETE_DURATION_MS_HISTOGRAM_NAME: str = (
    "platform.storage.upload.complete.duration.ms"
)
ADMIN_STORAGE_POLICY_DURATION_MS_HISTOGRAM_NAME: str = (
    "platform.admin.storage.policy.duration.ms"
)
ADMIN_STORAGE_PROVISIONING_QUERY_DURATION_MS_HISTOGRAM_NAME: str = (
    "platform.admin.storage.provisioning.query.duration.ms"
)

# Pipeline meter/tracer identity

PIPELINE_TRACER_NAME: str = "platform.pipeline"
PIPELINE_METER_NAME: str = "platform.pipeline"
