from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from collections import deque
from time import perf_counter

from opentelemetry import metrics

from app.observability.contract import (
    COORDINATION_API_STREAM_CONNECTION_DURATION_MS_HISTOGRAM_NAME,
    COORDINATION_CONNECTION_STATE_CHANGE_LOG_EVENT,
    COORDINATION_METER_NAME,
    COORDINATION_STREAM_BRIDGE_CLIENTS_GAUGE_NAME,
)

from .audit_writer import CoordinationAuditWriter
from .client import CoordinationClient
from .contracts import (
    COORDINATION_EVENT_RING_LIMIT,
    COORDINATION_RUNTIME_DISABLED_MESSAGE,
    COORDINATION_STREAM_MEDIA_TYPE,
    COORDINATION_STREAM_QUEUE_LIMIT,
    CoordinationRuntimeDisabledError,
    CoordinationSettings,
    utc_now_iso,
)

logger = logging.getLogger("platform-api.coordination-stream")
meter = metrics.get_meter(COORDINATION_METER_NAME)
_client_count = {"value": 0}
stream_connection_duration_ms = meter.create_histogram(
    COORDINATION_API_STREAM_CONNECTION_DURATION_MS_HISTOGRAM_NAME
)


def _make_observation(value: int):
    from opentelemetry.metrics import Observation

    return Observation(value)


meter.create_observable_gauge(
    COORDINATION_STREAM_BRIDGE_CLIENTS_GAUGE_NAME,
    callbacks=[lambda _options: [_make_observation(_client_count["value"])]],
)


class CoordinationEventStreamService:
    def __init__(
        self,
        settings: CoordinationSettings,
        client: CoordinationClient,
        audit_writer: CoordinationAuditWriter,
        *,
        ring_limit: int = COORDINATION_EVENT_RING_LIMIT,
        queue_limit: int = COORDINATION_STREAM_QUEUE_LIMIT,
        reconnect_base_seconds: float = 0.25,
        reconnect_max_seconds: float = 5.0,
    ) -> None:
        self.settings = settings
        self.client = client
        self.audit_writer = audit_writer
        self.ring_limit = ring_limit
        self.queue_limit = queue_limit
        self.reconnect_base_seconds = reconnect_base_seconds
        self.reconnect_max_seconds = reconnect_max_seconds
        self._buffer: deque[dict] = deque(maxlen=ring_limit)
        self._subscribers: set[tuple[asyncio.Queue, str | None, str | None]] = set()
        self._task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()
        self._state = "disabled" if not settings.enabled else "starting"
        self._last_error: str | None = None

    @property
    def enabled(self) -> bool:
        return self.settings.enabled

    async def start(self) -> None:
        if not self.enabled or self._task is not None:
            return
        self._task = asyncio.create_task(self._run(), name="coordination-event-stream")

    async def close(self) -> None:
        self._stop_event.set()
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        await self.client.close()

    def snapshot(self) -> dict:
        return {
            "state": self._state,
            "client_count": len(self._subscribers),
            "last_error": self._last_error,
        }

    def _enqueue(self, queue: asyncio.Queue, envelope: dict) -> None:
        if queue.qsize() >= self.queue_limit:
            with contextlib.suppress(asyncio.QueueEmpty):
                queue.get_nowait()
        queue.put_nowait(envelope)

    def _filter_match(self, envelope: dict, task_id: str | None, subject_prefix: str | None) -> bool:
        if envelope.get("type") == "control":
            return True
        if task_id and envelope.get("task_id") != task_id:
            return False
        if subject_prefix and not str(envelope.get("subject") or "").startswith(subject_prefix):
            return False
        return True

    async def publish_local_event(self, envelope: dict) -> None:
        self._buffer.append(envelope)
        self.audit_writer.append_audit_event(envelope)
        for queue, task_id, subject_prefix in list(self._subscribers):
            if self._filter_match(envelope, task_id, subject_prefix):
                self._enqueue(queue, envelope)

    async def publish_control(self, state: str, message: str | None = None) -> None:
        envelope = {
            "type": "control",
            "state": state,
            "message": message,
            "occurred_at": utc_now_iso(),
        }
        for queue, task_id, subject_prefix in list(self._subscribers):
            if self._filter_match(envelope, task_id, subject_prefix):
                self._enqueue(queue, envelope)

    async def _handle_client_event(self, envelope: dict) -> None:
        await self.publish_local_event(envelope)

    async def _run(self) -> None:
        backoff = self.reconnect_base_seconds
        while not self._stop_event.is_set():
            try:
                await self.client.connect()
                self._state = "connected"
                self._last_error = None
                logger.info(
                    COORDINATION_CONNECTION_STATE_CHANGE_LOG_EVENT,
                    extra={"state": "connected", "host": self.settings.host, "agent_id": self.settings.agent_id},
                )
                await self.publish_control("connected")
                await self.client.subscribe_events(self._handle_client_event, self._stop_event)
            except CoordinationRuntimeDisabledError:
                self._state = "disabled"
                return
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self._state = "degraded"
                self._last_error = str(exc)
                logger.warning(
                    COORDINATION_CONNECTION_STATE_CHANGE_LOG_EVENT,
                    extra={
                        "state": "degraded",
                        "host": self.settings.host,
                        "agent_id": self.settings.agent_id,
                        "error_type": type(exc).__name__,
                    },
                )
                await self.publish_control("degraded", str(exc))
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, self.reconnect_max_seconds)
            else:
                backoff = self.reconnect_base_seconds

    async def stream(self, *, task_id: str | None = None, subject_prefix: str | None = None, limit: int = 50):
        if not self.enabled:
            raise CoordinationRuntimeDisabledError(COORDINATION_RUNTIME_DISABLED_MESSAGE)

        queue: asyncio.Queue = asyncio.Queue(maxsize=self.queue_limit)
        started = perf_counter()
        self._subscribers.add((queue, task_id, subject_prefix))
        _client_count["value"] = len(self._subscribers)

        initial_control = {
            "type": "control",
            "state": "connected" if self._state == "connected" else "degraded",
            "message": self._last_error,
            "occurred_at": utc_now_iso(),
        }
        self._enqueue(queue, initial_control)
        if limit > 0:
            replay = [event for event in self._buffer if self._filter_match(event, task_id, subject_prefix)][-limit:]
            for envelope in replay:
                self._enqueue(queue, envelope)

        try:
            while True:
                envelope = await queue.get()
                yield f"data: {json.dumps(envelope)}\n\n"
        finally:
            self._subscribers.discard((queue, task_id, subject_prefix))
            _client_count["value"] = len(self._subscribers)
            stream_connection_duration_ms.record((perf_counter() - started) * 1000.0)

    @property
    def media_type(self) -> str:
        return COORDINATION_STREAM_MEDIA_TYPE
