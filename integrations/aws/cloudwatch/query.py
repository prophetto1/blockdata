from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.aws.cloudwatch.abstract_cloud_watch import AbstractCloudWatch
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Query(AbstractCloudWatch, RunnableTask):
    """Query CloudWatch metrics"""
    namespace: Property[str] | None = None
    metric_name: Property[str]
    dimensions: Property[list[DimensionKV]] | None = None
    statistic: Property[str] | None = None
    period_seconds: Property[int] | None = None
    window: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class DimensionKV:
        name: Property[str] | None = None
        value: Property[str] | None = None

    @dataclass(slots=True)
    class Output(io):
        count: int | None = None
        series: list[Map[String, Object]] | None = None


@dataclass(slots=True, kw_only=True)
class DimensionKV:
    name: Property[str] | None = None
    value: Property[str] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int | None = None
    series: list[Map[String, Object]] | None = None
