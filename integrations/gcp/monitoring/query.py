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
    """Query Cloud Monitoring time series"""
    filter: Property[str]
    window: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        count: int | None = None
        series: list[Map[String, Object]] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int | None = None
    series: list[Map[String, Object]] | None = None
