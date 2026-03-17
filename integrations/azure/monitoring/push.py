from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.monitoring.abstract_monitoring_task import AbstractMonitoringTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Push(AbstractMonitoringTask, RunnableTask):
    """Push metrics to Azure Monitor"""
    path: Property[str]
    metrics: Property[dict[String, Object]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        body: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    body: dict[String, Object] | None = None
