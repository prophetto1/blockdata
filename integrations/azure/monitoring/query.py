from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\monitoring\Query.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.azure.monitoring.abstract_monitoring_task import AbstractMonitoringTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Query(AbstractMonitoringTask):
    """Query metrics from Azure Monitor"""
    resource_ids: Property[list[str]]
    metric_names: Property[list[str]]
    metrics_namespace: Property[str]
    window: Property[timedelta] = Property.ofValue(Duration.ofMinutes(5))
    aggregations: Property[list[str]] | None = None
    interval: Property[timedelta] | None = None
    filter: Property[str] | None = None
    top: Property[int] | None = None
    order_by: Property[str] | None = None
    rollup_by: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        datapoints: int | None = None
        metrics: int | None = None
        resources: int | None = None
        results: list[dict[str, Any]] | None = None
