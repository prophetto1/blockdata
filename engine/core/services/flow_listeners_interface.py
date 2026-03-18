from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\FlowListenersInterface.java

from typing import Any, Callable, Protocol

from engine.core.models.flows.flow_with_source import FlowWithSource


class FlowListenersInterface(Protocol):
    def run(self) -> None: ...

    def listen(self, consumer: Callable[list[FlowWithSource]]) -> None: ...

    def flows(self) -> list[FlowWithSource]: ...
