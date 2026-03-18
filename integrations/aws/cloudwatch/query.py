from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\cloudwatch\Query.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.aws.cloudwatch.abstract_cloud_watch import AbstractCloudWatch
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Query(AbstractCloudWatch):
    """Query CloudWatch metrics"""
    metric_name: Property[str]
    statistic: Property[str] = Property.ofValue("Average")
    period_seconds: Property[int] = Property.ofValue(60)
    window: Property[timedelta] = Property.ofValue(Duration.ofMinutes(5))
    namespace: Property[str] | None = None
    dimensions: Property[list[DimensionKV]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class DimensionKV:
        name: Property[str] | None = None
        value: Property[str] | None = None

    @dataclass(slots=True)
    class Output:
        count: int | None = None
        series: list[dict[str, Any]] | None = None
