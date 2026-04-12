from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from time import perf_counter, time_ns
from typing import Any, Awaitable, Callable
from uuid import uuid4

from opentelemetry import metrics, trace

from app.observability.contract import (
    COORDINATION_API_IDENTITIES_READ_SPAN_NAME,
    COORDINATION_CONNECTION_STATE_CHANGE_LOG_EVENT,
    COORDINATION_JETSTREAM_PUBLISH_SPAN_NAME,
    COORDINATION_METER_NAME,
    COORDINATION_NATS_CONNECT_SPAN_NAME,
    COORDINATION_PUBLISH_COUNTER_NAME,
    COORDINATION_PUBLISH_DURATION_MS_HISTOGRAM_NAME,
    COORDINATION_SESSION_CLASSIFICATION_RESOLVE_COUNTER_NAME,
    COORDINATION_SESSION_CLASSIFICATION_UNKNOWN_COUNTER_NAME,
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
from .session_classification import (
    build_session_classification_summary,
    serialize_session_classification,
)

logger = logging.getLogger("platform-api.coordination-client")
tracer = trace.get_tracer(COORDINATION_TRACER_NAME)
meter = metrics.get_meter(COORDINATION_METER_NAME)
publish_counter = meter.create_counter(COORDINATION_PUBLISH_COUNTER_NAME)
publish_duration_ms = meter.create_histogram(COORDINATION_PUBLISH_DURATION_MS_HISTOGRAM_NAME)
session_classification_resolve_counter = meter.create_counter(
    COORDINATION_SESSION_CLASSIFICATION_RESOLVE_COUNTER_NAME
)
session_classification_unknown_counter = meter.create_counter(
    COORDINATION_SESSION_CLASSIFICATION_UNKNOWN_COUNTER_NAME
)


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


def _derive_family(identity: str | None, payload: dict) -> str | None:
    explicit_family = payload.get("family")
    if explicit_family:
        return str(explicit_family)
    if not identity:
        return None
    return str(identity).rstrip("0123456789") or str(identity)


def _parse_iso(value: Any) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _next_task_event_id(host: str) -> str:
    return f"{host}-{COORDINATION_RUNTIME_AGENT_ID}-{time_ns()}-{uuid4().hex[:8]}"


def _identity_is_stale(payload: dict) -> bool:
    if payload.get("status") == "released":
        return True
    expires_at = _parse_iso(payload.get("expiresAt"))
    if expires_at is None:
        return False
    return expires_at <= datetime.now(timezone.utc)


def _snake_participants(participants: list[dict] | None) -> list[dict]:
    normalized: list[dict] = []
    for participant in participants or []:
        normalized.append(
            {
                "host": participant.get("host"),
                "agent_id": participant.get("agentId"),
            }
        )
    return normalized


def _record_session_classification_metric(classification: dict[str, Any]) -> None:
    attrs = safe_attributes(
        {
            "coord.container_host": classification.get("container_host"),
            "coord.interaction_surface": classification.get("interaction_surface"),
            "coord.runtime_product": classification.get("runtime_product"),
            "coord.session_type_key": classification.get("key"),
            "coord.classified": classification.get("classified"),
            "coord.provenance": (classification.get("provenance") or {}).get("key"),
            "coord.result": "classified" if classification.get("classified") else "unknown",
        }
    )
    if classification.get("classified"):
        session_classification_resolve_counter.add(1, attrs)
        return
    session_classification_unknown_counter.add(1, attrs)


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

    async def _open_kv_bucket(self, bucket_name: str):
        js, _ = await self._ensure_connected()
        return await js.key_value(bucket_name)

    async def _list_kv_entries(self, bucket_name: str) -> list[tuple[str, Any]]:
        bucket = await self._open_kv_bucket(bucket_name)
        keys = await bucket.keys()
        entries: list[tuple[str, Any]] = []
        for key in keys:
            try:
                entries.append((key, await bucket.get(key)))
            except Exception:
                continue
        return entries

    async def get_runtime_snapshot(self) -> dict:
        _, jsm = await self._ensure_connected()
        stream_info = await jsm.stream_info(COORDINATION_STREAM_NAME)
        bucket_summaries: dict[str, dict] = {}
        for bucket_name in [
            "COORD_TASK_STATE",
            "COORD_TASK_PARTICIPANTS",
            "COORD_AGENT_PRESENCE",
            "COORD_TASK_CLAIMS",
            "COORD_DISCUSSION_STATE",
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

        identity_result = await self.get_identities(include_stale=True)
        identity_summary = identity_result["summary"]
        discussion_summary = (await self.get_discussions(status="all", limit=50))["summary"]
        session_classification_summary = {
            "classified_count": sum(
                count
                for key, count in identity_summary["session_classification_counts"].items()
                if key != "unknown"
            ),
            "unknown_count": identity_summary["session_classification_unknown_count"],
            "counts_by_type": dict(identity_summary["session_classification_counts"]),
            "counts_by_provenance": dict(
                identity_summary["session_classification_provenance_counts"]
            ),
        }

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
            "presence_summary": {"active_agents": identity_summary["active_count"]},
            "identity_summary": identity_summary,
            "discussion_summary": discussion_summary,
            "session_classification_summary": session_classification_summary,
            "hook_audit_summary": {
                "state": "not_configured",
                "record_count": 0,
                "allow_count": 0,
                "warn_count": 0,
                "block_count": 0,
                "error_count": 0,
            },
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

    async def get_identities(
        self,
        *,
        host: str | None = None,
        family: str | None = None,
        include_stale: bool = False,
    ) -> dict:
        entries = await self._list_kv_entries("COORD_AGENT_PRESENCE")
        identities: list[dict] = []
        classifications: list[dict[str, Any]] = []
        family_counts: dict[str, int] = {}
        hosts: set[str] = set()
        active_count = 0
        stale_count = 0

        for _, entry in entries:
            payload = _decode_json(getattr(entry, "value", None)) or {}
            identity = payload.get("identity") or payload.get("agentId")
            derived_family = _derive_family(identity, payload)
            stale = _identity_is_stale(payload)
            entry_host = payload.get("host")

            if host and entry_host != host:
                continue
            if family and derived_family != family:
                continue
            if stale and not include_stale:
                continue

            hosts.add(entry_host)
            if derived_family:
                family_counts[derived_family] = family_counts.get(derived_family, 0) + 1

            if stale:
                stale_count += 1
            else:
                active_count += 1

            classification = serialize_session_classification(payload)
            classifications.append(classification)
            _record_session_classification_metric(classification)
            identities.append(
                {
                    "lease_identity": identity,
                    "identity": identity,
                    "host": entry_host,
                    "family": derived_family,
                    "session_agent_id": payload.get("sessionAgentId"),
                    "claimed_at": payload.get("claimedAt"),
                    "last_heartbeat_at": payload.get("lastHeartbeatAt"),
                    "expires_at": payload.get("expiresAt"),
                    "stale": stale,
                    "revision": getattr(entry, "revision", None),
                    "session_classification": classification,
                }
            )

        identities.sort(key=lambda item: (str(item.get("host") or ""), str(item.get("identity") or "")))
        session_classification_summary = build_session_classification_summary(classifications)
        return {
            "summary": {
                "active_count": active_count,
                "stale_count": stale_count,
                "host_count": len(hosts),
                "family_counts": family_counts,
                "session_classification_counts": session_classification_summary["counts_by_type"],
                "session_classification_unknown_count": session_classification_summary["unknown_count"],
                "session_classification_provenance_counts": session_classification_summary[
                    "counts_by_provenance"
                ],
            },
            "identities": identities,
        }

    async def get_discussions(
        self,
        *,
        task_id: str | None = None,
        workspace_path: str | None = None,
        status: str = "all",
        limit: int = 50,
    ) -> dict:
        entries = await self._list_kv_entries("COORD_DISCUSSION_STATE")
        discussions: list[dict] = []

        for _, entry in entries:
            payload = _decode_json(getattr(entry, "value", None)) or {}
            normalized = {
                "task_id": payload.get("taskId"),
                "workspace_type": payload.get("workspaceType"),
                "workspace_path": payload.get("workspacePath"),
                "directional_doc": payload.get("directionalDoc"),
                "participants": _snake_participants(payload.get("participants")),
                "pending_recipients": _snake_participants(payload.get("pendingRecipients")),
                "last_event_kind": payload.get("lastEventKind"),
                "status": payload.get("status"),
                "updated_at": payload.get("updatedAt"),
            }
            if task_id and normalized["task_id"] != task_id:
                continue
            if workspace_path and normalized["workspace_path"] != workspace_path:
                continue
            if status != "all" and normalized["status"] != status:
                continue
            discussions.append(normalized)

        discussions.sort(key=lambda item: str(item.get("updated_at") or ""), reverse=True)
        if limit >= 0:
            discussions = discussions[:limit]

        return {
            "summary": {
                "thread_count": len(discussions),
                "pending_count": len([item for item in discussions if item.get("status") == "pending"]),
                "stale_count": len([item for item in discussions if item.get("status") == "stale"]),
                "workspace_bound_count": len([item for item in discussions if item.get("workspace_path")]),
            },
            "discussions": discussions,
        }

    async def publish_task_event(self, *, task_id: str, event_kind: str, note: str | None) -> dict:
        js, _ = await self._ensure_connected()
        event_id = _next_task_event_id(self.settings.host)
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
