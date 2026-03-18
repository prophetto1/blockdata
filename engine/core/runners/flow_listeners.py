from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\FlowListeners.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, Callable, ClassVar, Optional

from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.services.flow_listeners_interface import FlowListenersInterface
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.services.plugin_default_service import PluginDefaultService
from engine.core.queues.queue_interface import QueueInterface


@dataclass(slots=True, kw_only=True)
class FlowListeners:
    is_started: bool
    logger: ClassVar[Logger] = getLogger(__name__)
    consumers: list[Callable[list[FlowWithSource]]] = field(default_factory=list)
    consumers_each: list[Callable[FlowWithSource, FlowWithSource]] = field(default_factory=list)
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

    def listen(self, consumer: Callable[list[FlowWithSource]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def flows(self) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java
