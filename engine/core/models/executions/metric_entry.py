from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\MetricEntry.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry
from engine.core.models.executions.execution_kind import ExecutionKind
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.tenant_interface import TenantInterface


@dataclass(frozen=True, slots=True, kw_only=True)
class MetricEntry:
    namespace: str
    flow_id: str
    type: str
    name: str
    value: float
    timestamp: datetime
    tenant_id: str | None = None
    task_id: str | None = None
    execution_id: str | None = None
    task_run_id: str | None = None
    tags: dict[str, str] | None = None
    execution_kind: ExecutionKind | None = None

    @staticmethod
    def of(task_run: TaskRun, metric_entry: AbstractMetricEntry[Any], execution_kind: ExecutionKind) -> MetricEntry:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def compute_value(metric_entry: AbstractMetricEntry[Any]) -> float:
        raise NotImplementedError  # TODO: translate from Java
