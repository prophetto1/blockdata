from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ExecutionDependenciesStreamingService.java
# WARNING: Unresolved types: ConcurrentHashMap, FluxSink, Runnable

from dataclasses import dataclass
from typing import Any

from engine.webserver.models.events.event import Event
from engine.core.models.executions.execution import Execution
from engine.core.services.execution_service import ExecutionService
from engine.webserver.controllers.api.execution_status_event import ExecutionStatusEvent
from engine.core.models.flows.flow import Flow
from engine.core.models.topologies.flow_node import FlowNode
from engine.core.queues.queue_interface import QueueInterface


@dataclass(slots=True, kw_only=True)
class ExecutionDependenciesStreamingService:
    subscribers: dict[str, dict[str, Subscriber]] = new ConcurrentHashMap<>()
    subscriber_lock: Any = new Object()
    execution_queue: QueueInterface[Execution] | None = None
    execution_service: ExecutionService | None = None
    queue_consumer: Runnable | None = None

    def start_queue_consumer(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def register_subscriber(self, correlation_id: str, subscriber_id: str, consumer: Subscriber) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def unregister_subscriber(self, correlation_id: str, subscriber_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_stop_follow(self, flow: Flow, execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def shutdown(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_a_dependency(self, execution: Execution, nodes: list[FlowNode], correlation_id: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Subscriber:
        correlation_id: str | None = None
        dependencies: list[FlowNode] | None = None
        flows: dict[str, Flow] | None = None
        sink: FluxSink[Event[ExecutionStatusEvent]] | None = None
