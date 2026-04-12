from __future__ import annotations

import json
from types import SimpleNamespace
import pytest

from app.services.coordination.client import CoordinationClient
from app.services.coordination.contracts import COORDINATION_DURABLE_NAME, CoordinationSettings


class _FakeConnection:
    def __init__(self) -> None:
        self.is_connected = True
        self.jetstream_calls = 0
        self.jsm_calls = 0

    def jetstream(self):
        self.jetstream_calls += 1
        return "jetstream"

    def jsm(self):
        self.jsm_calls += 1
        return "jetstream-manager"

    async def close(self) -> None:
        self.is_connected = False


class _FakeNatsModule:
    def __init__(self, connection: _FakeConnection) -> None:
        self.connection = connection

    async def connect(self, *, servers):
        assert servers == ["nats://127.0.0.1:4222"]
        return self.connection


class _FakePublishAck:
    duplicate = False


class _FakeJetStream:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    async def publish(self, subject, payload, headers):
        self.calls.append(
            {
                "subject": subject,
                "payload": json.loads(payload.decode("utf-8")),
                "headers": headers,
            }
        )
        return _FakePublishAck()


@pytest.mark.asyncio
async def test_connect_uses_jsm_api(monkeypatch, tmp_path):
    settings = CoordinationSettings(
        enabled=True,
        nats_url="nats://127.0.0.1:4222",
        runtime_root=tmp_path,
        host="JON",
        agent_id="platform-api",
    )
    connection = _FakeConnection()
    client = CoordinationClient(settings)

    monkeypatch.setattr(
        "app.services.coordination.client._load_nats",
        lambda: (_FakeNatsModule(connection), object(), object(), object(), object()),
    )

    await client.connect()

    assert client.is_connected is True
    assert client._js == "jetstream"
    assert client._jsm == "jetstream-manager"
    assert connection.jetstream_calls == 1
    assert connection.jsm_calls == 1

    await client.close()


def test_durable_name_is_subject_token_safe():
    assert "." not in COORDINATION_DURABLE_NAME


@pytest.mark.asyncio
async def test_publish_task_event_generates_unique_message_ids(monkeypatch, tmp_path):
    settings = CoordinationSettings(
        enabled=True,
        nats_url="nats://127.0.0.1:4222",
        runtime_root=tmp_path,
        host="JON",
        agent_id="platform-api",
    )
    client = CoordinationClient(settings)
    fake_js = _FakeJetStream()

    async def fake_ensure_connected():
        return fake_js, object()

    monkeypatch.setattr(client, "_ensure_connected", fake_ensure_connected)
    monkeypatch.setattr("app.services.coordination.client.time_ns", lambda: 123456789)
    suffixes = iter(["aaaabbbb", "ccccdddd"])
    monkeypatch.setattr("app.services.coordination.client.uuid4", lambda: SimpleNamespace(hex=next(suffixes)))

    first = await client.publish_task_event(task_id="task-1", event_kind="progress", note="alpha")
    second = await client.publish_task_event(task_id="task-1", event_kind="progress", note="beta")

    assert first["event_id"] == "JON-platform-api-123456789-aaaabbbb"
    assert second["event_id"] == "JON-platform-api-123456789-ccccdddd"
    assert fake_js.calls[0]["headers"]["Nats-Msg-Id"] == first["event_id"]
    assert fake_js.calls[1]["headers"]["Nats-Msg-Id"] == second["event_id"]
    assert fake_js.calls[0]["payload"]["eventId"] == first["event_id"]
    assert fake_js.calls[1]["payload"]["eventId"] == second["event_id"]
