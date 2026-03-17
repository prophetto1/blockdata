from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\cloudwatch\Push.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.aws.cloudwatch.abstract_cloud_watch import AbstractCloudWatch
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Push(AbstractCloudWatch):
    """Push custom metrics to CloudWatch"""
    namespace: Property[str]
    metrics: Property[list[MetricValue]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class MetricValue:
        metric_name: Property[str]
        value: Property[float] | None = None
        unit: Property[str] | None = None
        dimensions: Property[dict[str, Any]] | None = None

    @dataclass(slots=True)
    class Output:
        count: int | None = None
