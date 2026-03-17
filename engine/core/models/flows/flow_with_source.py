from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\FlowWithSource.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.statistics.flow import Flow


@dataclass(slots=True, kw_only=True)
class FlowWithSource(Flow):
    source: str | None = None

    def to_flow(self) -> Flow:
        raise NotImplementedError  # TODO: translate from Java

    def get_source(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(flow: Flow, source: str) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java
