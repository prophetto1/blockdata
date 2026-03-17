from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\metrics\Counter.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.metrics.metric_registry import MetricRegistry


@dataclass(slots=True, kw_only=True)
class Counter(AbstractMetricEntry):
    value: float
    type: ClassVar[str] = "counter"
    type: str = TYPE

    @staticmethod
    def of(name: str, description: str, value: float | None = None) -> Counter:
        raise NotImplementedError  # TODO: translate from Java

    def register(self, meter_registry: MetricRegistry, name: str, description: str, tags: dict[str, str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def increment(self, value: float) -> None:
        raise NotImplementedError  # TODO: translate from Java
