from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\AbstractMetricEntry.java
# WARNING: Unresolved types: T

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.executions.metrics.counter import Counter
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.models.executions.metrics.timer import Timer


@dataclass(slots=True, kw_only=True)
class AbstractMetricEntry:
    name: str
    timestamp: datetime = Instant.now()
    description: str | None = None
    tags: dict[str, str] | None = None

    def get_type(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def tags_as_map() -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def tags_as_array(self, others: dict[str, str]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def metric_name(self, prefix: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_value(self) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def register(self, meter_registry: MetricRegistry, name: str, description: str, tags: dict[str, str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def increment(self, value: T) -> None:
        raise NotImplementedError  # TODO: translate from Java
