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


class _FakeKvEntry:
    def __init__(self, payload: dict, *, revision: int | None = None) -> None:
        self.value = json.dumps(payload).encode("utf-8")
        self.revision = revision


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


@pytest.mark.asyncio
async def test_get_identities_serializes_lease_identity_and_session_classification(monkeypatch, tmp_path):
    settings = CoordinationSettings(
        enabled=True,
        nats_url="nats://127.0.0.1:4222",
        runtime_root=tmp_path,
        host="JON",
        agent_id="platform-api",
    )
    client = CoordinationClient(settings)

    async def fake_list_kv_entries(_bucket_name: str):
        return [
            (
                "presence.cc",
                _FakeKvEntry(
                    {
                        "identity": "cc",
                        "host": "JON",
                        "family": "cc",
                        "sessionAgentId": "jon-cc-runtime",
                        "claimedAt": "2026-04-11T12:00:00Z",
                        "lastHeartbeatAt": "2026-04-11T12:01:00Z",
                        "expiresAt": "2030-04-11T12:03:00Z",
                        "details": {
                            "sessionClassification": {
                                "key": "vscode.cc.cli",
                                "containerHost": "vscode",
                                "interactionSurface": "cli",
                                "runtimeProduct": "cc",
                                "classified": True,
                                "registryVersion": 1,
                                "reason": None,
                                "provenance": {
                                    "key": "launch_stamped",
                                    "containerHost": "launch_stamped",
                                    "interactionSurface": "launch_stamped",
                                    "runtimeProduct": "launch_stamped",
                                },
                            }
                        },
                    },
                    revision=7,
                ),
            ),
            (
                "presence.cc2",
                _FakeKvEntry(
                    {
                        "identity": "cc2",
                        "host": "JON",
                        "family": "cc",
                        "sessionAgentId": "jon-cc-unknown-runtime",
                        "claimedAt": "2026-04-11T12:02:00Z",
                        "lastHeartbeatAt": "2026-04-11T12:03:00Z",
                        "expiresAt": "2030-04-11T12:05:00Z",
                        "details": {
                            "sessionClassification": {
                                "key": "unknown",
                                "containerHost": "vscode",
                                "interactionSurface": "unknown",
                                "runtimeProduct": "unknown",
                                "classified": False,
                                "registryVersion": 1,
                                "reason": "insufficient_signal",
                                "provenance": {
                                    "key": "unknown",
                                    "containerHost": "launch_stamped",
                                    "interactionSurface": "unknown",
                                    "runtimeProduct": "unknown",
                                },
                            }
                        },
                    },
                    revision=8,
                ),
            ),
        ]

    monkeypatch.setattr(client, "_list_kv_entries", fake_list_kv_entries)

    result = await client.get_identities(include_stale=True)

    assert result["summary"] == {
        "active_count": 2,
        "stale_count": 0,
        "host_count": 1,
        "family_counts": {"cc": 2},
        "session_classification_counts": {
            "vscode.cc.cli": 1,
            "vscode.cdx.cli": 0,
            "vscode.cc.ide-panel": 0,
            "vscode.cdx.ide-panel": 0,
            "claude-desktop.cc": 0,
            "codex-app-win.cdx": 0,
            "terminal.cc": 0,
            "terminal.cdx": 0,
            "unknown": 1,
        },
        "session_classification_unknown_count": 1,
        "session_classification_provenance_counts": {
            "launch_stamped": 1,
            "runtime_observed": 0,
            "configured": 0,
            "inferred": 0,
            "unknown": 1,
        },
    }
    assert result["identities"] == [
        {
            "lease_identity": "cc",
            "identity": "cc",
            "host": "JON",
            "family": "cc",
            "session_agent_id": "jon-cc-runtime",
            "claimed_at": "2026-04-11T12:00:00Z",
            "last_heartbeat_at": "2026-04-11T12:01:00Z",
            "expires_at": "2030-04-11T12:03:00Z",
            "stale": False,
            "revision": 7,
            "session_classification": {
                "key": "vscode.cc.cli",
                "display_label": "VS Code | CC CLI",
                "container_host": "vscode",
                "interaction_surface": "cli",
                "runtime_product": "cc",
                "classified": True,
                "registry_version": 1,
                "reason": None,
                "provenance": {
                    "key": "launch_stamped",
                    "container_host": "launch_stamped",
                    "interaction_surface": "launch_stamped",
                    "runtime_product": "launch_stamped",
                    "display_label": "derived",
                },
            },
        },
        {
            "lease_identity": "cc2",
            "identity": "cc2",
            "host": "JON",
            "family": "cc",
            "session_agent_id": "jon-cc-unknown-runtime",
            "claimed_at": "2026-04-11T12:02:00Z",
            "last_heartbeat_at": "2026-04-11T12:03:00Z",
            "expires_at": "2030-04-11T12:05:00Z",
            "stale": False,
            "revision": 8,
            "session_classification": {
                "key": "unknown",
                "display_label": "Unknown",
                "container_host": "vscode",
                "interaction_surface": "unknown",
                "runtime_product": "unknown",
                "classified": False,
                "registry_version": 1,
                "reason": "insufficient_signal",
                "provenance": {
                    "key": "unknown",
                    "container_host": "launch_stamped",
                    "interaction_surface": "unknown",
                    "runtime_product": "unknown",
                    "display_label": "derived",
                },
            },
        },
    ]


@pytest.mark.asyncio
async def test_get_identities_maps_legacy_records_without_classification_to_unknown(monkeypatch, tmp_path):
    settings = CoordinationSettings(
        enabled=True,
        nats_url="nats://127.0.0.1:4222",
        runtime_root=tmp_path,
        host="JON",
        agent_id="platform-api",
    )
    client = CoordinationClient(settings)

    async def fake_list_kv_entries(_bucket_name: str):
        return [
            (
                "presence.legacy-cdx",
                _FakeKvEntry(
                    {
                        "identity": "legacy-cdx",
                        "host": "JON",
                        "family": "cdx",
                        "sessionAgentId": "jon-legacy-runtime",
                        "claimedAt": "2026-04-11T12:10:00Z",
                        "lastHeartbeatAt": "2026-04-11T12:11:00Z",
                        "expiresAt": "2030-04-11T12:13:00Z",
                    },
                    revision=11,
                ),
            )
        ]

    monkeypatch.setattr(client, "_list_kv_entries", fake_list_kv_entries)

    result = await client.get_identities(include_stale=True)

    assert result["summary"]["session_classification_counts"]["unknown"] == 1
    assert result["summary"]["session_classification_unknown_count"] == 1
    assert result["summary"]["session_classification_provenance_counts"]["unknown"] == 1
    assert result["identities"][0]["lease_identity"] == "legacy-cdx"
    assert result["identities"][0]["session_classification"] == {
        "key": "unknown",
        "display_label": "Unknown",
        "container_host": "unknown",
        "interaction_surface": "unknown",
        "runtime_product": "unknown",
        "classified": False,
        "registry_version": 1,
        "reason": None,
        "provenance": {
            "key": "unknown",
            "container_host": "unknown",
            "interaction_surface": "unknown",
            "runtime_product": "unknown",
            "display_label": "derived",
        },
    }


@pytest.mark.asyncio
async def test_get_identities_ignores_non_lease_presence_records(monkeypatch, tmp_path):
    settings = CoordinationSettings(
        enabled=True,
        nats_url="nats://127.0.0.1:4222",
        runtime_root=tmp_path,
        host="JON",
        agent_id="platform-api",
    )
    client = CoordinationClient(settings)

    async def fake_list_kv_entries(_bucket_name: str):
        return [
            (
                "presence.codex-heartbeat",
                _FakeKvEntry(
                    {
                        "agentId": "codex",
                        "host": "JON",
                        "status": "online",
                        "lastHeartbeatAt": "2026-04-09T21:09:57.184Z",
                    },
                    revision=2,
                ),
            ),
            (
                "presence.legacy-cdx",
                _FakeKvEntry(
                    {
                        "identity": "legacy-cdx",
                        "host": "JON",
                        "family": "cdx",
                        "sessionAgentId": "jon-legacy-runtime",
                        "claimedAt": "2026-04-11T12:10:00Z",
                        "lastHeartbeatAt": "2026-04-11T12:11:00Z",
                        "expiresAt": "2030-04-11T12:13:00Z",
                    },
                    revision=11,
                ),
            ),
        ]

    monkeypatch.setattr(client, "_list_kv_entries", fake_list_kv_entries)

    result = await client.get_identities(include_stale=True)

    assert result["summary"]["active_count"] == 1
    assert result["summary"]["stale_count"] == 0
    assert result["summary"]["host_count"] == 1
    assert result["identities"] == [
        {
            "lease_identity": "legacy-cdx",
            "identity": "legacy-cdx",
            "host": "JON",
            "family": "cdx",
            "session_agent_id": "jon-legacy-runtime",
            "claimed_at": "2026-04-11T12:10:00Z",
            "last_heartbeat_at": "2026-04-11T12:11:00Z",
            "expires_at": "2030-04-11T12:13:00Z",
            "stale": False,
            "revision": 11,
            "session_classification": {
                "key": "unknown",
                "display_label": "Unknown",
                "container_host": "unknown",
                "interaction_surface": "unknown",
                "runtime_product": "unknown",
                "classified": False,
                "registry_version": 1,
                "reason": None,
                "provenance": {
                    "key": "unknown",
                    "container_host": "unknown",
                    "interaction_surface": "unknown",
                    "runtime_product": "unknown",
                    "display_label": "derived",
                },
            },
        }
    ]
