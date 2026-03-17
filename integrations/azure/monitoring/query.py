from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.gcp.monitoring.abstract_monitoring_task import AbstractMonitoringTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Query(AbstractMonitoringTask, RunnableTask):
    """Query metrics from Azure Monitor"""
    resource_ids: Property[list[String]]
    metric_names: Property[list[String]]
    metrics_namespace: Property[str]
    window: Property[timedelta] | None = None
    aggregations: Property[list[String]] | None = None
    interval: Property[timedelta] | None = None
    filter: Property[str] | None = None
    top: Property[int] | None = None
    order_by: Property[str] | None = None
    rollup_by: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        datapoints: int | None = None
        metrics: int | None = None
        resources: int | None = None
        results: list[Map[String, Object]] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    datapoints: int | None = None
    metrics: int | None = None
    resources: int | None = None
    results: list[Map[String, Object]] | None = None
