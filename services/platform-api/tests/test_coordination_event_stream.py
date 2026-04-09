from __future__ import annotations

import asyncio
import json

import pytest

from app.services.coordination.audit_writer import CoordinationAuditWriter
from app.services.coordination.contracts import CoordinationSettings
from app.services.coordination.event_stream import CoordinationEventStreamService


class _FakeClient:
    def __init__(self, *, fail_connect_once: bool = False) -> None:
        self.fail_connect_once = fail_connect_once
        self.connect_calls = 0
        self.connected = asyncio.Event()
        self.subscribed = asyncio.Event()

    async def connect(self) -> None:
        self.connect_calls += 1
        if self.fail_connect_once and self.connect_calls == 1:
            raise ConnectionError("broker offline")
        self.connected.set()

    async def close(self) -> None:
        return None

    async def subscribe_events(self, callback, stop_event: asyncio.Event) -> None:
        self.subscribed.set()
        await callback(
            {
                "event_id": "evt-1",
                "subject": "coord.tasks.task-1.event.created",
                "task_id": "task-1",
                "event_kind": "created",
                "host": "JON",
                "agent_id": "buddy",
                "buffered": False,
                "occurred_at": "2026-04-09T12:00:00Z",
                "payload": {"note": "ready"},
            }
        )
        await stop_event.wait()


def _settings(tmp_path) -> CoordinationSettings:
    return CoordinationSettings(
        enabled=True,
        nats_url="nats://127.0.0.1:4222",
        runtime_root=tmp_path,
        host="JON",
        agent_id="platform-api",
    )


async def _read_event(chunks) -> dict:
    chunk = await anext(chunks)
    assert chunk.startswith("data: ")
    return json.loads(chunk[len("data: ") :].strip())


async def _wait_until(predicate, *, timeout: float = 1.0) -> None:
    deadline = asyncio.get_running_loop().time() + timeout
    while asyncio.get_running_loop().time() < deadline:
        if predicate():
            return
        await asyncio.sleep(0.01)
    raise AssertionError("timed out waiting for predicate")


@pytest.mark.asyncio
async def test_stream_replays_matching_events_after_initial_control(tmp_path):
    service = CoordinationEventStreamService(
        _settings(tmp_path),
        _FakeClient(),
        CoordinationAuditWriter(tmp_path, host="JON"),
    )
    await service.publish_local_event(
        {
            "event_id": "evt-1",
            "subject": "coord.tasks.task-1.event.created",
            "task_id": "task-1",
            "event_kind": "created",
            "host": "JON",
            "agent_id": "buddy",
            "buffered": False,
            "occurred_at": "2026-04-09T12:00:00Z",
            "payload": {},
        }
    )
    await service.publish_local_event(
        {
            "event_id": "evt-2",
            "subject": "coord.tasks.task-2.event.created",
            "task_id": "task-2",
            "event_kind": "created",
            "host": "JON",
            "agent_id": "buddy",
            "buffered": False,
            "occurred_at": "2026-04-09T12:01:00Z",
            "payload": {},
        }
    )

    chunks = service.stream(task_id="task-1", subject_prefix="coord.tasks.task-1", limit=10)

    control = await _read_event(chunks)
    replay = await _read_event(chunks)

    assert control["type"] == "control"
    assert control["state"] == "degraded"
    assert replay["task_id"] == "task-1"
    assert replay["subject"] == "coord.tasks.task-1.event.created"

    await chunks.aclose()


@pytest.mark.asyncio
async def test_start_connects_and_stream_receives_connected_control_and_event(tmp_path):
    fake_client = _FakeClient()
    service = CoordinationEventStreamService(
        _settings(tmp_path),
        fake_client,
        CoordinationAuditWriter(tmp_path, host="JON"),
        reconnect_base_seconds=0.01,
        reconnect_max_seconds=0.02,
    )

    await service.start()
    await fake_client.connected.wait()
    await fake_client.subscribed.wait()

    chunks = service.stream(limit=10)

    control = await _read_event(chunks)
    event = await _read_event(chunks)

    assert control["type"] == "control"
    assert control["state"] == "connected"
    assert event["event_id"] == "evt-1"
    assert service.snapshot()["state"] == "connected"

    await chunks.aclose()
    await service.close()


@pytest.mark.asyncio
async def test_start_recovers_from_initial_connect_failure(tmp_path):
    fake_client = _FakeClient(fail_connect_once=True)
    service = CoordinationEventStreamService(
        _settings(tmp_path),
        fake_client,
        CoordinationAuditWriter(tmp_path, host="JON"),
        reconnect_base_seconds=0.01,
        reconnect_max_seconds=0.02,
    )

    await service.start()
    await _wait_until(lambda: service.snapshot()["state"] == "degraded")
    chunks = service.stream(limit=0)

    degraded = await _read_event(chunks)
    assert degraded["type"] == "control"
    assert degraded["state"] == "degraded"

    await _wait_until(lambda: service.snapshot()["state"] == "connected")
    connected = await _read_event(chunks)
    assert connected["type"] == "control"
    assert connected["state"] == "connected"

    await chunks.aclose()
    await service.close()
