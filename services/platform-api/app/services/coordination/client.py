from __future__ import annotations

import asyncio
import json
import logging
from time import perf_counter
from typing import Any, Awaitable, Callable

from opentelemetry import metrics, trace

from app.observability.contract import (
    COORDINATION_CONNECTION_STATE_CHANGE_LOG_EVENT,
    COORDINATION_JETSTREAM_PUBLISH_SPAN_NAME,
    COORDINATION_METER_NAME,
    COORDINATION_NATS_CONNECT_SPAN_NAME,
    COORDINATION_PUBLISH_COUNTER_NAME,
    COORDINATION_PUBLISH_DURATION_MS_HISTOGRAM_NAME,
    COORDINATION_TASK_EVENT_LOG_EVENT,
    COORDINATION_TRACER_NAME,
    safe_attributes,
    set_span_attributes,
)

from .contracts import (
    COORDINATION_DURABLE_NAME,
    COORDINATION_RUNTIME_AGENT_ID,
    COORDINATION_STREAM_DUPLICATE_WINDOW_HOURS,
    COORDINATION_STREAM_NAME,
    CoordinationRuntimeDisabledError,
    CoordinationSettings,
    utc_now_iso,
)

logger = logging.getLogger("platform-api.coordination-client")
tracer = trace.get_tracer(COORDINATION_TRACER_NAME)
meter = metrics.get_meter(COORDINATION_METER_NAME)
publish_counter = meter.create_counter(COORDINATION_PUBLISH_COUNTER_NAME)
publish_duration_ms = meter.create_histogram(COORDINATION_PUBLISH_DURATION_MS_HISTOGRAM_NAME)


def _load_nats() -> tuple[Any, Any, Any, Any]:
    import nats
    from nats.js.api import AckPolicy, ConsumerConfig, DeliverPolicy, ReplayPolicy

    return nats, AckPolicy, ConsumerConfig, DeliverPolicy, ReplayPolicy


def _decode_json(data: bytes | bytearray | memoryview | None) -> dict | None:
    if not data:
        return None
    return json.loads(bytes(data).decode("utf-8"))


def _normalize_event(subject: str, payload: dict) -> dict:
    return {
        "event_id": payload.get("eventId"),
        "subject": subject,
        "task_id": payload.get("taskId"),
        "event_kind": payload.get("eventKind"),
        "host": payload.get("host"),
        "agent_id": payload.get("agentId"),
        "buffered": bool(payload.get("bufferedAt")),
        "occurred_at": payload.get("occurredAt"),
        "payload": payload.get("payload"),
    }


class CoordinationClient:
    def __init__(self, settings: CoordinationSettings) -> None:
        self.settings = settings
        self._nc: Any | None = None
        self._js: Any | None = None
        self._jsm: Any | None = None
        self._connection_lock = asyncio.Lock()
        self._last_error: str | None = None

    @property
    def enabled(self) -> bool:
        return self.settings.enabled

    @property
    def is_connected(self) -> bool:
        return bool(self._nc is not None and getattr(self._nc, "is_connected", False))

    @property
    def last_error(self) -> str | None:
        return self._last_error

    async def connect(self) -> None:
        if not self.enabled:
            raise CoordinationRuntimeDisabledError("Coordination runtime is disabled")

        async with self._connection_lock:
            if self.is_connected:
                return

            nats, *_ = _load_nats()
            started = perf_counter()
            with tracer.start_as_current_span(COORDINATION_NATS_CONNECT_SPAN_NAME) as span:
                set_span_attributes(
                    span,
                    {
                        "coord.host": self.settings.host,
                        "coord.agent_id": COORDINATION_RUNTIME_AGENT_ID,
                        "coord.result": "attempt",
                    },
                )
                try:
                    self._nc = await asyncio.wait_for(
                        nats.connect(servers=[self.settings.nats_url]),
                        timeout=self.settings.connect_timeout_seconds,
                    )
                    self._js = self._nc.jetstream()
                    self._jsm = self._nc.jsm()
                    self._last_error = None
                    logger.info(
                        COORDINATION_CONNECTION_STATE_CHANGE_LOG_EVENT,
                        extra={
                            "state": "connected",
                            "host": self.settings.host,
                            "agent_id": COORDINATION_RUNTIME_AGENT_ID,
                        },
                    )
                    set_span_attributes(span, {"coord.result": "connected"})
                except Exception as exc:  # pragma: no cover - exercised through degraded route behavior
                    self._last_error = str(exc)
                    logger.warning(
                        COORDINATION_CONNECTION_STATE_CHANGE_LOG_EVENT,
                        extra={
                            "state": "connect_failed",
                            "host": self.settings.host,
                            "agent_id": COORDINATION_RUNTIME_AGENT_ID,
                            "error_type": type(exc).__name__,
                        },
                    )
                    set_span_attributes(span, {"coord.result": "failed"})
                    raise
                finally:
                    set_span_attributes(span, {"coord.duration_ms": (perf_counter() - started) * 1000.0})

    async def close(self) -> None:
        if self._nc is not None:
            try:
                await self._nc.close()
            finally:
                self._nc = None
                self._js = None
                self._jsm = None

    async def _ensure_connected(self) -> tuple[Any, Any]:
        await self.connect()
        return self._js, self._jsm

    async def get_runtime_snapshot(self) -> dict:
        _, jsm = await self._ensure_connected()
        stream_info = await jsm.stream_info(COORDINATION_STREAM_NAME)
        bucket_summaries: dict[str, dict] = {}
        active_agents = 0
        for bucket_name in [
            "COORD_TASK_STATE",
            "COORD_TASK_PARTICIPANTS",
            "COORD_AGENT_PRESENCE",
            "COORD_TASK_CLAIMS",
        ]:
            info = await jsm.stream_info(f"KV_{bucket_name}")
            summary = {
                "stream_name": info.config.name,
                "history": getattr(info.config, "max_msgs_per_subject", None),
                "ttl_seconds": getattr(info.config, "max_age", None),
                "messages": getattr(info.state, "messages", None),
                "active_keys": getattr(info.state, "num_subjects", 0),
            }
            bucket_summaries[bucket_name] = summary
            if bucket_name == "COORD_AGENT_PRESENCE":
                active_agents = int(summary["active_keys"] or 0)

        return {
            "broker": {
                "state": "available",
                "server": getattr(getattr(self._nc, "connected_url", None), "netloc", None),
                "url": self.settings.nats_url,
            },
            "streams": {
                COORDINATION_STREAM_NAME: {
                    "subjects": list(getattr(stream_info.config, "subjects", []) or []),
                    "storage": str(getattr(stream_info.config, "storage", "")),
                    "replicas": getattr(stream_info.config, "num_replicas", None),
                    "messages": getattr(stream_info.state, "messages", None),
                }
            },
            "kv_buckets": bucket_summaries,
            "presence_summary": {"active_agents": active_agents},
        }

    async def _get_last_json_message(self, stream_name: str, subject: str) -> dict | None:
        _, jsm = await self._ensure_connected()
        try:
            message = await jsm.get_last_msg(stream_name, subject=subject)
        except Exception:
            return None
        return _decode_json(getattr(message, "data", None))

    async def get_task_snapshot(self, task_id: str) -> dict:
        task = await self._get_last_json_message("KV_COORD_TASK_STATE", f"$KV.COORD_TASK_STATE.task.{task_id}")
        claim = await self._get_last_json_message("KV_COORD_TASK_CLAIMS", f"$KV.COORD_TASK_CLAIMS.task.{task_id}")
        participants = await self._get_last_json_message(
            "KV_COORD_TASK_PARTICIPANTS",
            f"$KV.COORD_TASK_PARTICIPANTS.task.{task_id}",
        )
        return {
            "task": task,
            "claim": claim,
            "participants": participants.get("participants") if isinstance(participants, dict) else [],
        }

    async def publish_task_event(self, *, task_id: str, event_kind: str, note: str | None) -> dict:
        js, _ = await self._ensure_connected()
        event_id = f"{self.settings.host}-{COORDINATION_RUNTIME_AGENT_ID}-{int(perf_counter() * 1000)}"
        payload = {
            "eventId": event_id,
            "taskId": task_id,
            "eventKind": event_kind,
            "host": self.settings.host,
            "agentId": COORDINATION_RUNTIME_AGENT_ID,
            "occurredAt": utc_now_iso(),
            "payload": {"note": note} if note else {},
        }
        subject = f"coord.tasks.{task_id}.event.{event_kind}"
        started = perf_counter()
        with tracer.start_as_current_span(COORDINATION_JETSTREAM_PUBLISH_SPAN_NAME) as span:
            attrs = safe_attributes(
                {
                    "coord.subject_family": "coord.tasks.event",
                    "coord.event_kind": event_kind,
                    "coord.task_id": task_id,
                    "coord.host": self.settings.host,
                    "coord.agent_id": COORDINATION_RUNTIME_AGENT_ID,
                    "coord.result": "ok",
                    "coord.buffered": False,
                }
            )
            set_span_attributes(span, attrs)
            ack = await js.publish(
                subject,
                json.dumps(payload).encode("utf-8"),
                headers={"Nats-Msg-Id": event_id},
            )
            publish_counter.add(1, attrs)
            publish_duration_ms.record((perf_counter() - started) * 1000.0, attrs)
            logger.info(
                COORDINATION_TASK_EVENT_LOG_EVENT,
                extra={
                    "event_id": event_id,
                    "task_id": task_id,
                    "host": self.settings.host,
                    "agent_id": COORDINATION_RUNTIME_AGENT_ID,
                    "subject_family": "coord.tasks.event",
                    "buffered": False,
                },
            )
            return {
                "event_id": event_id,
                "subject": subject,
                "buffered": False,
                "stream_name": COORDINATION_STREAM_NAME,
                "duplicate_window_hours": COORDINATION_STREAM_DUPLICATE_WINDOW_HOURS,
                "duplicate": bool(getattr(ack, "duplicate", False)),
            }

    async def subscribe_events(
        self,
        callback: Callable[[dict], Awaitable[None]],
        stop_event: asyncio.Event,
    ) -> None:
        js, _ = await self._ensure_connected()
        _, AckPolicy, ConsumerConfig, DeliverPolicy, ReplayPolicy = _load_nats()
        subscription = await js.pull_subscribe(
            "coord.>",
            durable=COORDINATION_DURABLE_NAME,
            stream=COORDINATION_STREAM_NAME,
            config=ConsumerConfig(
                durable_name=COORDINATION_DURABLE_NAME,
                ack_policy=AckPolicy.EXPLICIT,
                deliver_policy=DeliverPolicy.NEW,
                replay_policy=ReplayPolicy.INSTANT,
                ack_wait=30.0,
                max_ack_pending=256,
                filter_subject="coord.>",
            ),
        )

        try:
            while not stop_event.is_set():
                try:
                    messages = await subscription.fetch(batch=10, timeout=1)
                except Exception as exc:
                    if type(exc).__name__ in {"TimeoutError", "FetchTimeoutError"}:
                        continue
                    raise

                for message in messages:
                    payload = _decode_json(getattr(message, "data", None)) or {}
                    await callback(_normalize_event(getattr(message, "subject", ""), payload))
                    await message.ack()
        finally:
            try:
                await subscription.unsubscribe()
            except Exception:
                logger.debug("Coordination subscription already closed", exc_info=True)
