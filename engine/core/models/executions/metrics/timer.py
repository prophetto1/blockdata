from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\metrics\Timer.java

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.metrics.metric_registry import MetricRegistry


@dataclass(slots=True, kw_only=True)
class Timer(AbstractMetricEntry):
    value: timedelta
    type: ClassVar[str] = "timer"
    type: str = TYPE

    @staticmethod
    def of(name: str, value: timedelta) -> Timer:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(name: str, description: str, value: timedelta) -> Timer:
        raise NotImplementedError  # TODO: translate from Java

    def register(self, meter_registry: MetricRegistry, name: str, description: str, tags: dict[str, str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def increment(self, value: timedelta) -> None:
        raise NotImplementedError  # TODO: translate from Java
