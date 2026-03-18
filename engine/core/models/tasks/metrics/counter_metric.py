from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\metrics\CounterMetric.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.tasks.metrics.abstract_metric import AbstractMetric
from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class CounterMetric(AbstractMetric):
    value: Property[float]
    type: ClassVar[str] = "counter"

    def to_metric(self, run_context: RunContext) -> AbstractMetricEntry[Any]:
        raise NotImplementedError  # TODO: translate from Java
