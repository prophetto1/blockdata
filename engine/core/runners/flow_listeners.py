from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\FlowListeners.java
# WARNING: Unresolved types: AtomicBoolean, BiConsumer, Consumer

from dataclasses import dataclass, field
from typing import Any, Optional

from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.services.flow_listeners_interface import FlowListenersInterface
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.services.plugin_default_service import PluginDefaultService
from engine.core.queues.queue_interface import QueueInterface


@dataclass(slots=True, kw_only=True)
class FlowListeners:
    is_started: AtomicBoolean = new AtomicBoolean(false)
    consumers: list[Consumer[list[FlowWithSource]]] = field(default_factory=list)
    consumers_each: list[BiConsumer[FlowWithSource, FlowWithSource]] = field(default_factory=list)
    flow_queue: QueueInterface[FlowInterface] | None = None
    flows: list[FlowWithSource] | None = None
    plugin_default_service: PluginDefaultService | None = None

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def previous(self, flow: FlowWithSource) -> Optional[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def remove(self, flow: FlowInterface) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def upsert(self, flow: FlowWithSource) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def notify_consumers(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def notify_consumers_each(self, flow: FlowWithSource, previous: FlowWithSource) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def listen(self, consumer: Consumer[list[FlowWithSource]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def listen(self, consumer: BiConsumer[FlowWithSource, FlowWithSource]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def flows(self) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java
