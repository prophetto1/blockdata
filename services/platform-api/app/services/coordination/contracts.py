from __future__ import annotations

import os
import socket
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

COORDINATION_RUNTIME_DISABLED_CODE = "coordination_runtime_disabled"
COORDINATION_RUNTIME_DISABLED_MESSAGE = "Coordination runtime is disabled"
COORDINATION_STREAM_NAME = "COORD_EVENTS"
COORDINATION_STREAM_MEDIA_TYPE = "text/event-stream"
COORDINATION_DURABLE_NAME = "platform-api.coordination-events"
COORDINATION_RUNTIME_AGENT_ID = "platform-api"
COORDINATION_OUTBOX_MAX_BYTES = 32 * 1024 * 1024
COORDINATION_STREAM_DUPLICATE_WINDOW_HOURS = 24
COORDINATION_DEFAULT_EVENT_LIMIT = 50
COORDINATION_EVENT_RING_LIMIT = 250
COORDINATION_STREAM_QUEUE_LIMIT = 250

KV_BUCKETS = {
    "task": "COORD_TASK_STATE",
    "participants": "COORD_TASK_PARTICIPANTS",
    "presence": "COORD_AGENT_PRESENCE",
    "claims": "COORD_TASK_CLAIMS",
}


class CoordinationRuntimeDisabledError(RuntimeError):
    """Raised when the coordination runtime is intentionally disabled."""


class CoordinationUnavailableError(RuntimeError):
    """Raised when the broker is unavailable and no safe fallback exists."""


@dataclass(frozen=True)
class CoordinationSettings:
    enabled: bool
    nats_url: str
    runtime_root: Path
    host: str
    agent_id: str = COORDINATION_RUNTIME_AGENT_ID
    connect_timeout_seconds: float = 1.5


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def disabled_error_payload() -> dict[str, str]:
    return {
        "code": COORDINATION_RUNTIME_DISABLED_CODE,
        "message": COORDINATION_RUNTIME_DISABLED_MESSAGE,
    }


def build_coordination_settings() -> CoordinationSettings:
    enabled_raw = os.environ.get("COORDINATION_RUNTIME_ENABLED")
    enabled = False if enabled_raw is None else enabled_raw.strip().lower() in {"1", "true", "yes", "on"}
    nats_url = os.environ.get("COORDINATION_NATS_URL", "nats://127.0.0.1:4222").strip()
    runtime_root = Path(
        os.environ.get(
            "COORDINATION_RUNTIME_ROOT",
            str(Path.cwd() / ".codex-tmp" / "coordination-runtime"),
        )
    ).resolve()
    host = (
        os.environ.get("COMPUTERNAME")
        or os.environ.get("HOSTNAME")
        or socket.gethostname()
    )
    return CoordinationSettings(
        enabled=enabled,
        nats_url=nats_url,
        runtime_root=runtime_root,
        host=host,
    )
