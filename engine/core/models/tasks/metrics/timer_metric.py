from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\metrics\TimerMetric.java

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.models.tasks.metrics.abstract_metric import AbstractMetric
from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class TimerMetric(AbstractMetric):
    value: Property[timedelta]
    t_y_p_e: str = "timer"

    def to_metric(self, run_context: RunContext) -> AbstractMetricEntry[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
