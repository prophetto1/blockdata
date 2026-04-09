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
STORAGE_DOWNLOAD_SIGN_COUNTER_NAME: str = "platform.storage.download.sign_url.count"
STORAGE_DOWNLOAD_SIGN_FAILURE_COUNTER_NAME: str = "platform.storage.download.sign_url.failure.count"
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
STORAGE_DOWNLOAD_SIGN_DURATION_MS_HISTOGRAM_NAME: str = (
    "platform.storage.download.sign_url.duration_ms"
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
PIPELINE_SOURCE_SET_CREATE_COUNTER_NAME: str = "platform.pipeline.source_set.create.count"
PIPELINE_SOURCE_SET_UPDATE_COUNTER_NAME: str = "platform.pipeline.source_set.update.count"
PIPELINE_JOB_CREATE_COUNTER_NAME: str = "platform.pipeline.job.create.count"
PIPELINE_JOB_COMPLETE_COUNTER_NAME: str = "platform.pipeline.job.complete.count"
PIPELINE_JOB_FAILED_COUNTER_NAME: str = "platform.pipeline.job.failed.count"
PIPELINE_JOB_REAPED_COUNTER_NAME: str = "platform.pipeline.job.reaped.count"
PIPELINE_DELIVERABLE_DOWNLOAD_COUNTER_NAME: str = "platform.pipeline.deliverable.download.count"
PIPELINE_JOB_DURATION_MS_HISTOGRAM_NAME: str = "platform.pipeline.job.duration.ms"
PIPELINE_STAGE_DURATION_MS_HISTOGRAM_NAME: str = "platform.pipeline.stage.duration.ms"
PIPELINE_CHUNK_COUNT_HISTOGRAM_NAME: str = "platform.pipeline.chunk.count"
PIPELINE_SOURCE_SET_MEMBER_COUNT_HISTOGRAM_NAME: str = "platform.pipeline.source_set.member_count"
PIPELINE_JOB_COMPLETED_LOG_EVENT: str = "pipeline.job.completed"
PIPELINE_JOB_FAILED_LOG_EVENT: str = "pipeline.job.failed"
PIPELINE_JOB_REAPED_LOG_EVENT: str = "pipeline.job.reaped"
PIPELINE_SOURCE_SET_CHANGED_LOG_EVENT: str = "pipeline.source_set.changed"
PIPELINE_STAGE_EXECUTE_SPAN_NAME: str = "pipeline.stage.execute"

# Coordination meter/tracer identity

COORDINATION_TRACER_NAME: str = "platform.coordination"
COORDINATION_METER_NAME: str = "platform.coordination"
COORDINATION_PUBLISH_COUNTER_NAME: str = "platform.coordination.publish.count"
COORDINATION_BUFFERED_COUNTER_NAME: str = "platform.coordination.buffered.count"
COORDINATION_CLAIM_COUNTER_NAME: str = "platform.coordination.claim.count"
COORDINATION_CLAIM_CONFLICT_COUNTER_NAME: str = "platform.coordination.claim_conflict.count"
COORDINATION_OUTBOX_FLUSH_COUNTER_NAME: str = "platform.coordination.outbox.flush.count"
COORDINATION_OUTBOX_BACKLOG_EVENTS_GAUGE_NAME: str = "platform.coordination.outbox.backlog.events"
COORDINATION_PRESENCE_ACTIVE_AGENTS_GAUGE_NAME: str = "platform.coordination.presence.active_agents"
COORDINATION_STREAM_BRIDGE_CLIENTS_GAUGE_NAME: str = "platform.coordination.stream.bridge.clients"
COORDINATION_PUBLISH_DURATION_MS_HISTOGRAM_NAME: str = "platform.coordination.publish.duration.ms"
COORDINATION_OUTBOX_FLUSH_DURATION_MS_HISTOGRAM_NAME: str = (
    "platform.coordination.outbox.flush.duration.ms"
)
COORDINATION_API_STREAM_CONNECTION_DURATION_MS_HISTOGRAM_NAME: str = (
    "platform.coordination.api.stream.connection.duration.ms"
)
COORDINATION_TASK_EVENT_LOG_EVENT: str = "coordination.task.event"
COORDINATION_CONNECTION_STATE_CHANGE_LOG_EVENT: str = "coordination.connection.state_change"
COORDINATION_OUTBOX_FLUSH_LOG_EVENT: str = "coordination.outbox.flush"
COORDINATION_CLAIM_CONFLICT_LOG_EVENT: str = "coordination.claim.conflict"
COORDINATION_NATS_CONNECT_SPAN_NAME: str = "coordination.nats.connect"
COORDINATION_JETSTREAM_PUBLISH_SPAN_NAME: str = "coordination.jetstream.publish"
COORDINATION_KV_CLAIM_UPSERT_SPAN_NAME: str = "coordination.kv.claim.upsert"
COORDINATION_KV_STATE_PATCH_SPAN_NAME: str = "coordination.kv.state.patch"
COORDINATION_OUTBOX_FLUSH_SPAN_NAME: str = "coordination.outbox.flush"
COORDINATION_API_STATUS_READ_SPAN_NAME: str = "coordination.api.status.read"
COORDINATION_API_STREAM_OPEN_SPAN_NAME: str = "coordination.api.stream.open"
