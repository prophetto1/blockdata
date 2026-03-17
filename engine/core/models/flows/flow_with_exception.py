from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\FlowWithException.java
# WARNING: Unresolved types: Exception, JsonNode, Logger

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.statistics.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.flows.flow_with_source import FlowWithSource


@dataclass(slots=True, kw_only=True)
class FlowWithException(FlowWithSource):
    exception: str | None = None

    @staticmethod
    def from(flow: FlowInterface, exception: Exception) -> FlowWithException:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(source: str, exception: Exception, log: Logger) -> Optional[FlowWithException]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(json_node: JsonNode, exception: Exception) -> Optional[FlowWithException]:
        raise NotImplementedError  # TODO: translate from Java

    def to_flow(self) -> Flow:
        raise NotImplementedError  # TODO: translate from Java
