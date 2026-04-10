from __future__ import annotations

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
