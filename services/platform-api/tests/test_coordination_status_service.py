from __future__ import annotations

import json

import pytest

from app.observability.contract import (
    COORDINATION_API_STATUS_READ_SPAN_NAME,
    COORDINATION_BUFFERED_COUNTER_NAME,
    COORDINATION_CONNECTION_STATE_CHANGE_LOG_EVENT,
    COORDINATION_PUBLISH_COUNTER_NAME,
    COORDINATION_STREAM_BRIDGE_CLIENTS_GAUGE_NAME,
    COORDINATION_TASK_EVENT_LOG_EVENT,
)
from app.services.coordination.audit_writer import CoordinationAuditWriter
from app.services.coordination.contracts import CoordinationSettings
from app.services.coordination.status_service import CoordinationStatusService


class _FakeBridge:
    def __init__(self, snapshot: dict | None = None) -> None:
        self._snapshot = snapshot or {"state": "connected", "client_count": 2, "last_error": None}

    def snapshot(self) -> dict:
        return dict(self._snapshot)


class _FakeClient:
    def __init__(
        self,
        *,
        runtime_snapshot: dict | Exception | None = None,
        task_snapshot: dict | Exception | None = None,
        publish_result: dict | Exception | None = None,
    ) -> None:
        self.runtime_snapshot = runtime_snapshot
        self.task_snapshot = task_snapshot
        self.publish_result = publish_result

    async def get_runtime_snapshot(self) -> dict:
        if isinstance(self.runtime_snapshot, Exception):
            raise self.runtime_snapshot
        return self.runtime_snapshot or {
            "broker": {"state": "available", "url": "nats://127.0.0.1:4222"},
            "streams": {"COORD_EVENTS": {"messages": 3}},
            "kv_buckets": {"COORD_AGENT_PRESENCE": {"active_keys": 2}},
            "presence_summary": {"active_agents": 2},
            "identity_summary": {
                "active_count": 2,
                "stale_count": 0,
                "host_count": 1,
                "family_counts": {"cdx": 2},
            },
            "discussion_summary": {
                "thread_count": 1,
                "pending_count": 1,
                "stale_count": 0,
                "workspace_bound_count": 1,
            },
            "hook_audit_summary": {
                "state": "not_configured",
                "record_count": 0,
                "allow_count": 0,
                "warn_count": 0,
                "block_count": 0,
                "error_count": 0,
            },
        }

    async def get_task_snapshot(self, _task_id: str) -> dict:
        if isinstance(self.task_snapshot, Exception):
            raise self.task_snapshot
        return self.task_snapshot or {
            "task": {"task_id": "task-1", "state": "open"},
            "claim": {"task_id": "task-1", "claimed_by": "buddy"},
            "participants": [{"agent_id": "buddy"}],
        }

    async def publish_task_event(self, *, task_id: str, event_kind: str, note: str | None) -> dict:
        if isinstance(self.publish_result, Exception):
            raise self.publish_result
        return self.publish_result or {
            "event_id": "evt-1",
            "subject": f"coord.tasks.{task_id}.event.{event_kind}",
            "buffered": False,
            "stream_name": "COORD_EVENTS",
            "duplicate_window_hours": 24,
            "note": note,
        }


def _settings(tmp_path) -> CoordinationSettings:
    return CoordinationSettings(
        enabled=True,
        nats_url="nats://127.0.0.1:4222",
        runtime_root=tmp_path,
        host="JON",
        agent_id="platform-api",
    )


def _event(task_id: str, event_kind: str, *, buffered: bool = False) -> dict:
    return {
        "event_id": f"{task_id}-{event_kind}",
        "subject": f"coord.tasks.{task_id}.event.{event_kind}",
        "task_id": task_id,
        "event_kind": event_kind,
        "host": "JON",
        "agent_id": "platform-api",
        "buffered": buffered,
        "occurred_at": "2026-04-09T12:00:00Z",
        "payload": {},
    }


@pytest.mark.asyncio
async def test_get_status_returns_locked_shape(tmp_path):
    buffered_event = _event("task-1", "created", buffered=True)
    audit_writer = CoordinationAuditWriter(tmp_path, host="JON")
    audit_writer.buffer_event(buffered_event)
    service = CoordinationStatusService(
        _settings(tmp_path),
        _FakeClient(),
        audit_writer,
        _FakeBridge(),
    )

    result = await service.get_status()

    assert set(result.keys()) == {
        "broker",
        "streams",
        "kv_buckets",
        "presence_summary",
        "identity_summary",
        "discussion_summary",
        "hook_audit_summary",
        "local_host_outbox_backlog",
        "app_runtime",
        "stream_bridge",
    }
    assert result["broker"]["state"] == "available"
    assert result["presence_summary"] == {"active_agents": 2}
    assert result["identity_summary"] == {
        "active_count": 2,
        "stale_count": 0,
        "host_count": 1,
        "family_counts": {"cdx": 2},
    }
    assert result["discussion_summary"] == {
        "thread_count": 1,
        "pending_count": 1,
        "stale_count": 0,
        "workspace_bound_count": 1,
    }
    assert result["hook_audit_summary"] == {
        "state": "not_configured",
        "record_count": 0,
        "allow_count": 0,
        "warn_count": 0,
        "block_count": 0,
        "error_count": 0,
    }
    assert result["local_host_outbox_backlog"]["files"] == 1
    assert result["local_host_outbox_backlog"]["events"] == 1
    assert result["local_host_outbox_backlog"]["bytes"] >= len(json.dumps(buffered_event).encode("utf-8"))
    assert result["app_runtime"]["runtime_enabled"] is True
    assert result["app_runtime"]["host"] == "JON"
    assert result["stream_bridge"]["state"] == "connected"


@pytest.mark.asyncio
async def test_get_status_returns_degraded_shape_when_broker_read_fails(tmp_path):
    service = CoordinationStatusService(
        _settings(tmp_path),
        _FakeClient(runtime_snapshot=ConnectionError("broker unavailable")),
        CoordinationAuditWriter(tmp_path, host="JON"),
        _FakeBridge({"state": "degraded", "client_count": 0, "last_error": "broker unavailable"}),
    )

    result = await service.get_status()

    assert result["broker"] == {"state": "unavailable", "error_type": "ConnectionError"}
    assert result["streams"] == {}
    assert result["kv_buckets"] == {}
    assert result["presence_summary"] == {"active_agents": 0}
    assert result["identity_summary"] == {
        "active_count": 0,
        "stale_count": 0,
        "host_count": 0,
        "family_counts": {},
    }
    assert result["discussion_summary"] == {
        "thread_count": 0,
        "pending_count": 0,
        "stale_count": 0,
        "workspace_bound_count": 0,
    }
    assert result["hook_audit_summary"] == {
        "state": "not_configured",
        "record_count": 0,
        "allow_count": 0,
        "warn_count": 0,
        "block_count": 0,
        "error_count": 0,
    }
    assert result["stream_bridge"]["state"] == "degraded"


@pytest.mark.asyncio
async def test_get_task_snapshot_reads_recent_events_and_latest_audit_file(tmp_path):
    audit_writer = CoordinationAuditWriter(tmp_path, host="JON")
    audit_writer.append_audit_event(_event("task-1", "created"))
    audit_writer.append_audit_event(_event("task-2", "created"))
    service = CoordinationStatusService(
        _settings(tmp_path),
        _FakeClient(),
        audit_writer,
        _FakeBridge(),
    )

    result = await service.get_task_snapshot(task_id="task-1", limit=10)

    assert result["task"]["task_id"] == "task-1"
    assert result["claim"]["claimed_by"] == "buddy"
    assert result["participants"] == [{"agent_id": "buddy"}]
    assert result["recent_events"] == [_event("task-1", "created")]
    assert result["local_host_audit_file"].endswith(".ndjson")
    assert "coordination-audit" in result["local_host_audit_file"]
    assert "platform-api" in result["local_host_audit_file"]


@pytest.mark.asyncio
async def test_publish_probe_task_event_buffers_when_broker_publish_fails(tmp_path):
    audit_writer = CoordinationAuditWriter(tmp_path, host="JON")
    service = CoordinationStatusService(
        _settings(tmp_path),
        _FakeClient(publish_result=TimeoutError("broker timeout")),
        audit_writer,
        _FakeBridge(),
    )

    result = await service.publish_probe_task_event(
        task_id="task-9",
        event_kind="claimed",
        note="buffer locally",
        actor_id="admin-user",
    )

    assert result["buffered"] is True
    assert result["stream_name"] == "COORD_EVENTS"
    assert result["duplicate_window_hours"] == 24
    assert result["fallback_error_type"] == "TimeoutError"
    assert audit_writer.get_outbox_backlog()["events"] == 1


def test_coordination_observability_contract_names_are_frozen():
    assert COORDINATION_PUBLISH_COUNTER_NAME == "platform.coordination.publish.count"
    assert COORDINATION_BUFFERED_COUNTER_NAME == "platform.coordination.buffered.count"
    assert COORDINATION_STREAM_BRIDGE_CLIENTS_GAUGE_NAME == "platform.coordination.stream.bridge.clients"
    assert COORDINATION_TASK_EVENT_LOG_EVENT == "coordination.task.event"
    assert COORDINATION_CONNECTION_STATE_CHANGE_LOG_EVENT == "coordination.connection.state_change"
    assert COORDINATION_API_STATUS_READ_SPAN_NAME == "coordination.api.status.read"
