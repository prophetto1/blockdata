from __future__ import annotations

import logging
from typing import Any

from opentelemetry import metrics

from app.observability.contract import (
    COORDINATION_BUFFERED_COUNTER_NAME,
    COORDINATION_METER_NAME,
    COORDINATION_OUTBOX_BACKLOG_EVENTS_GAUGE_NAME,
    COORDINATION_PRESENCE_ACTIVE_AGENTS_GAUGE_NAME,
    COORDINATION_TASK_EVENT_LOG_EVENT,
    safe_attributes,
)

from .audit_writer import CoordinationAuditWriter
from .client import CoordinationClient
from .contracts import (
    COORDINATION_STREAM_DUPLICATE_WINDOW_HOURS,
    COORDINATION_STREAM_NAME,
    CoordinationRuntimeDisabledError,
    CoordinationUnavailableError,
    CoordinationSettings,
    utc_now_iso,
)
from .session_classification import empty_session_classification_summary

logger = logging.getLogger("platform-api.coordination-status")
meter = metrics.get_meter(COORDINATION_METER_NAME)
_outbox_events = {"value": 0}
_active_agents = {"value": 0}
buffered_counter = meter.create_counter(COORDINATION_BUFFERED_COUNTER_NAME)


def _make_observation(value: int):
    from opentelemetry.metrics import Observation

    return Observation(value)


meter.create_observable_gauge(
    COORDINATION_OUTBOX_BACKLOG_EVENTS_GAUGE_NAME,
    callbacks=[lambda _options: [_make_observation(_outbox_events["value"])]],
)
meter.create_observable_gauge(
    COORDINATION_PRESENCE_ACTIVE_AGENTS_GAUGE_NAME,
    callbacks=[lambda _options: [_make_observation(_active_agents["value"])]],
)


class CoordinationStatusService:
    def __init__(
        self,
        settings: CoordinationSettings,
        client: CoordinationClient,
        audit_writer: CoordinationAuditWriter,
        event_stream_service: Any | None = None,
    ) -> None:
        self.settings = settings
        self.client = client
        self.audit_writer = audit_writer
        self.event_stream_service = event_stream_service

    @property
    def enabled(self) -> bool:
        return self.settings.enabled

    async def get_status(self) -> dict:
        if not self.enabled:
            raise CoordinationRuntimeDisabledError("Coordination runtime is disabled")

        backlog = self.audit_writer.get_outbox_backlog()
        _outbox_events["value"] = backlog["events"]
        bridge_snapshot = self.event_stream_service.snapshot() if self.event_stream_service else {"state": "disabled", "client_count": 0}

        try:
            broker_snapshot = await self.client.get_runtime_snapshot()
        except Exception as exc:
            logger.warning("Failed to inspect coordination broker status", exc_info=True)
            broker_snapshot = {
                "broker": {"state": "unavailable", "error_type": type(exc).__name__},
                "streams": {},
                "kv_buckets": {},
                "presence_summary": {"active_agents": 0},
                "identity_summary": {
                    "active_count": 0,
                    "stale_count": 0,
                    "host_count": 0,
                    "family_counts": {},
                },
                "discussion_summary": {
                    "thread_count": 0,
                    "pending_count": 0,
                    "stale_count": 0,
                    "workspace_bound_count": 0,
                },
                "session_classification_summary": empty_session_classification_summary(),
                "hook_audit_summary": {
                    "state": "not_configured",
                    "record_count": 0,
                    "allow_count": 0,
                    "warn_count": 0,
                    "block_count": 0,
                    "error_count": 0,
                },
            }

        _active_agents["value"] = int((broker_snapshot.get("presence_summary") or {}).get("active_agents") or 0)
        session_classification_summary = broker_snapshot.get("session_classification_summary")
        if not isinstance(session_classification_summary, dict):
            session_classification_summary = empty_session_classification_summary()

        return {
            "broker": broker_snapshot["broker"],
            "streams": broker_snapshot["streams"],
            "kv_buckets": broker_snapshot["kv_buckets"],
            "presence_summary": broker_snapshot["presence_summary"],
            "identity_summary": broker_snapshot["identity_summary"],
            "discussion_summary": broker_snapshot["discussion_summary"],
            "session_classification_summary": session_classification_summary,
            "hook_audit_summary": broker_snapshot["hook_audit_summary"],
            "local_host_outbox_backlog": backlog,
            "app_runtime": {
                "runtime_enabled": self.settings.enabled,
                "host": self.settings.host,
                "runtime_root": str(self.settings.runtime_root),
            },
            "stream_bridge": bridge_snapshot,
        }

    async def get_identities(
        self,
        *,
        host: str | None,
        family: str | None,
        include_stale: bool,
    ) -> dict:
        if not self.enabled:
            raise CoordinationRuntimeDisabledError("Coordination runtime is disabled")

        try:
            return await self.client.get_identities(
                host=host,
                family=family,
                include_stale=include_stale,
            )
        except CoordinationUnavailableError:
            raise
        except Exception as exc:
            logger.warning("Failed to read coordination identities", exc_info=True)
            raise CoordinationUnavailableError(str(exc)) from exc

    async def get_discussions(
        self,
        *,
        task_id: str | None,
        workspace_path: str | None,
        status: str,
        limit: int,
    ) -> dict:
        if not self.enabled:
            raise CoordinationRuntimeDisabledError("Coordination runtime is disabled")

        try:
            return await self.client.get_discussions(
                task_id=task_id,
                workspace_path=workspace_path,
                status=status,
                limit=limit,
            )
        except CoordinationUnavailableError:
            raise
        except Exception as exc:
            logger.warning("Failed to read coordination discussions", exc_info=True)
            raise CoordinationUnavailableError(str(exc)) from exc

    async def get_task_snapshot(self, *, task_id: str, limit: int = 25) -> dict:
        if not self.enabled:
            raise CoordinationRuntimeDisabledError("Coordination runtime is disabled")

        try:
            snapshot = await self.client.get_task_snapshot(task_id)
        except Exception:
            logger.warning("Failed to inspect coordination task snapshot", exc_info=True)
            snapshot = {"task": None, "claim": None, "participants": []}

        return {
            "task": snapshot.get("task"),
            "claim": snapshot.get("claim"),
            "participants": snapshot.get("participants") or [],
            "recent_events": self.audit_writer.read_recent_events(task_id=task_id, limit=limit),
            "local_host_audit_file": self.audit_writer.latest_audit_file(),
        }

    async def publish_probe_task_event(
        self,
        *,
        task_id: str,
        event_kind: str,
        note: str | None,
        actor_id: str,
    ) -> dict:
        if not self.enabled:
            raise CoordinationRuntimeDisabledError("Coordination runtime is disabled")

        _ = actor_id
        try:
            return await self.client.publish_task_event(task_id=task_id, event_kind=event_kind, note=note)
        except Exception as exc:
            envelope = {
                "event_id": f"buffered-{task_id}-{event_kind}",
                "subject": f"coord.tasks.{task_id}.event.{event_kind}",
                "task_id": task_id,
                "event_kind": event_kind,
                "host": self.settings.host,
                "agent_id": self.settings.agent_id,
                "buffered": True,
                "occurred_at": utc_now_iso(),
                "payload": {"note": note} if note else {},
            }
            try:
                self.audit_writer.buffer_event(envelope)
            except CoordinationUnavailableError:
                raise
            buffered_counter.add(
                1,
                safe_attributes(
                    {
                        "coord.host": self.settings.host,
                        "coord.agent_id": self.settings.agent_id,
                        "coord.event_kind": event_kind,
                        "coord.buffered": True,
                    }
                ),
            )
            logger.info(
                COORDINATION_TASK_EVENT_LOG_EVENT,
                extra={
                    "event_id": envelope["event_id"],
                    "task_id": task_id,
                    "host": self.settings.host,
                    "agent_id": self.settings.agent_id,
                    "subject_family": "coord.tasks.event",
                    "buffered": True,
                },
            )
            return {
                "event_id": envelope["event_id"],
                "subject": envelope["subject"],
                "buffered": True,
                "stream_name": COORDINATION_STREAM_NAME,
                "duplicate_window_hours": COORDINATION_STREAM_DUPLICATE_WINDOW_HOURS,
                "fallback_error_type": type(exc).__name__,
            }
