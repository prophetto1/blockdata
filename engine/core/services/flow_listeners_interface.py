from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\FlowListenersInterface.java
# WARNING: Unresolved types: BiConsumer, Consumer

from typing import Any, Protocol

from engine.core.models.flows.flow_with_source import FlowWithSource


class FlowListenersInterface(Protocol):
    def run(self) -> None: ...

    def listen(self, consumer: Consumer[list[FlowWithSource]]) -> None: ...

    def listen(self, consumer: BiConsumer[FlowWithSource, FlowWithSource]) -> None: ...

    def flows(self) -> list[FlowWithSource]: ...
