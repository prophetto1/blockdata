from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\LogStreamingService.java
# WARNING: Unresolved types: ConcurrentHashMap, FluxSink, Pair, Runnable

from dataclasses import dataclass
from typing import Any

from engine.webserver.models.events.event import Event
from engine.core.models.executions.log_entry import LogEntry
from engine.core.queues.queue_interface import QueueInterface


@dataclass(slots=True, kw_only=True)
class LogStreamingService:
    subscribers: dict[str, dict[str, Pair[FluxSink[Event[LogEntry]], list[str]]]] = new ConcurrentHashMap<>()
    subscriber_lock: Any = new Object()
    log_queue: QueueInterface[LogEntry] | None = None
    queue_consumer: Runnable | None = None

    def start_queue_consumer(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def register_subscriber(self, execution_id: str, subscriber_id: str, sink: FluxSink[Event[LogEntry]], levels: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def unregister_subscriber(self, execution_id: str, subscriber_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def shutdown(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
