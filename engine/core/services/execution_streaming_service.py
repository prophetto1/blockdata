from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\ExecutionStreamingService.java
# WARNING: Unresolved types: ConcurrentHashMap, FluxSink, Pair, Runnable

from dataclasses import dataclass
from typing import Any

from engine.webserver.models.events.event import Event
from engine.core.models.executions.execution import Execution
from engine.core.plugins.notifications.execution_service import ExecutionService
from engine.core.models.flows.flow import Flow
from engine.core.queues.queue_interface import QueueInterface


@dataclass(slots=True, kw_only=True)
class ExecutionStreamingService:
    subscribers: dict[str, dict[str, Pair[FluxSink[Event[Execution]], Flow]]] = new ConcurrentHashMap<>()
    subscriber_lock: Any = new Object()
    execution_queue: QueueInterface[Execution] | None = None
    execution_service: ExecutionService | None = None
    queue_consumer: Runnable | None = None

    def start_queue_consumer(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def register_subscriber(self, execution_id: str, subscriber_id: str, sink: FluxSink[Event[Execution]], flow: Flow) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def unregister_subscriber(self, execution_id: str, subscriber_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_stop_follow(self, flow: Flow, execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def shutdown(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
