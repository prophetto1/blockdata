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


# ── Canonical metric names (counters) ────────────────────────────────

SECRETS_LIST_COUNTER_NAME: str = "platform.secrets.list.count"
SECRETS_CHANGE_COUNTER_NAME: str = "platform.secrets.change.count"
CRYPTO_FALLBACK_COUNTER_NAME: str = "platform.crypto.fallback.count"

# ── Canonical structured log event names ─────────────────────────────

SECRETS_CHANGED_LOG_EVENT: str = "secrets.changed"

# ── Canonical span names ─────────────────────────────────────────────

SECRETS_LIST_SPAN_NAME: str = "secrets.list"
SECRETS_CREATE_SPAN_NAME: str = "secrets.create"
SECRETS_UPDATE_SPAN_NAME: str = "secrets.update"
SECRETS_DELETE_SPAN_NAME: str = "secrets.delete"

# ── Storage meter/tracer identity ────────────────────────────────────
# Storage-specific metric helper names remain local to storage_metrics.py
# in this pass. Only the stable namespace identity is owned here.

STORAGE_TRACER_NAME: str = "platform.storage"
STORAGE_METER_NAME: str = "platform.storage"

# Pipeline meter/tracer identity

PIPELINE_TRACER_NAME: str = "platform.pipeline"
PIPELINE_METER_NAME: str = "platform.pipeline"
