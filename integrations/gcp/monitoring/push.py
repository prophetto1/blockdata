from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.gcp.monitoring.abstract_monitoring_task import AbstractMonitoringTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class MetricKind(str, Enum):
    GAUGE = "GAUGE"
    CUMULATIVE = "CUMULATIVE"
    DELTA = "DELTA"


@dataclass(slots=True, kw_only=True)
class Push(AbstractMonitoringTask, RunnableTask):
    """Push metrics to Cloud Monitoring"""
    metrics: Property[list[MetricValue]] | None = None
    window: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_interval(self, kind: MetricKind, window: timedelta, now: datetime) -> TimeInterval:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class MetricValue:
        metric_type: Property[str] | None = None
        value: Property[float] | None = None
        metric_kind: Property[MetricKind] | None = None
        labels: Property[dict[String, String]] | None = None

    @dataclass(slots=True)
    class Output(io):
        count: int | None = None


@dataclass(slots=True, kw_only=True)
class MetricValue:
    metric_type: Property[str] | None = None
    value: Property[float] | None = None
    metric_kind: Property[MetricKind] | None = None
    labels: Property[dict[String, String]] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int | None = None
