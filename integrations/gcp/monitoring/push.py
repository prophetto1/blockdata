from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\monitoring\Push.java
# WARNING: Unresolved types: Exception, TimeInterval, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.azure.monitoring.abstract_monitoring_task import AbstractMonitoringTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Push(AbstractMonitoringTask):
    """Push metrics to Cloud Monitoring"""
    window: Property[timedelta] = Property.ofValue(Duration.ofMinutes(1))
    metrics: Property[list[MetricValue]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_interval(self, kind: MetricKind, window: timedelta, now: datetime) -> TimeInterval:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class MetricValue:
        metric_kind: Property[MetricKind] = Property.ofValue(MetricKind.GAUGE)
        metric_type: Property[str] | None = None
        value: Property[float] | None = None
        labels: Property[dict[str, str]] | None = None

    class MetricKind(str, Enum):
        GAUGE = "GAUGE"
        CUMULATIVE = "CUMULATIVE"
        DELTA = "DELTA"

    @dataclass(slots=True)
    class Output:
        count: int | None = None
