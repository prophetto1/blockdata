from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\AbstractMetricEntry.java
# WARNING: Unresolved types: T

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.executions.metrics.counter import Counter
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.models.executions.metrics.timer import Timer


@dataclass(slots=True, kw_only=True)
class AbstractMetricEntry(ABC):
    name: str
    timestamp: datetime = Instant.now()
    description: str | None = None
    tags: dict[str, str] | None = None

    @abstractmethod
    def get_type(self) -> str:
        ...

    @staticmethod
    def tags_as_map() -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def tags_as_array(self, others: dict[str, str]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def metric_name(self, prefix: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def get_value(self) -> T:
        ...

    @abstractmethod
    def register(self, meter_registry: MetricRegistry, name: str, description: str, tags: dict[str, str]) -> None:
        ...

    @abstractmethod
    def increment(self, value: T) -> None:
        ...
