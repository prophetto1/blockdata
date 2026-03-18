from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\metrics\MetricAggregations.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.metrics.metric_aggregation import MetricAggregation


@dataclass(slots=True, kw_only=True)
class MetricAggregations:
    group_by: str
    aggregations: list[MetricAggregation]
