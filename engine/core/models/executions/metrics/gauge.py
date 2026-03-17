from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\metrics\Gauge.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.metrics.metric_registry import MetricRegistry


@dataclass(slots=True, kw_only=True)
class Gauge(AbstractMetricEntry):
    value: float
    t_y_p_e: ClassVar[str] = "gauge"
    type: str = TYPE

    @staticmethod
    def of(name: str, value: float) -> Gauge:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(name: str, description: str, value: float) -> Gauge:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(name: str, value: int) -> Gauge:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(name: str, description: str, value: int) -> Gauge:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(name: str, value: int) -> Gauge:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(name: str, description: str, value: int) -> Gauge:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(name: str, value: float) -> Gauge:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(name: str, description: str, value: float) -> Gauge:
        raise NotImplementedError  # TODO: translate from Java

    def register(self, meter_registry: MetricRegistry, name: str, description: str, tags: dict[str, str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def increment(self, value: float) -> None:
        raise NotImplementedError  # TODO: translate from Java
