from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\metrics\AbstractMetric.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.models.tasks.metrics.counter_metric import CounterMetric
from engine.core.models.tasks.metrics.gauge_metric import GaugeMetric
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.metrics.timer_metric import TimerMetric


@dataclass(slots=True, kw_only=True)
class AbstractMetric(ABC):
    name: Property[str]
    type: str
    description: Property[str] | None = None
    tags: Property[dict[str, str]] | None = None

    @abstractmethod
    def to_metric(self, run_context: RunContext) -> AbstractMetricEntry[Any]:
        ...
