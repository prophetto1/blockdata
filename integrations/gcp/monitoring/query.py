from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\monitoring\Query.java
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
    """Query Cloud Monitoring time series"""
    filter: Property[str]
    window: Property[timedelta] = Property.ofValue(Duration.ofMinutes(5))

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
        series: list[dict[str, Any]] | None = None
