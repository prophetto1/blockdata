from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.meta.instagram.abstract_instagram_task import AbstractInstagramTask
from integrations.meta.instagram.enums.insight_metric import InsightMetric
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class GetInsights(AbstractInstagramTask):
    """Collect Instagram media insights"""
    media_id: Property[str]
    metrics: Property[list[InsightMetric]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Insight:
        name: str | None = None
        period: str | None = None
        title: str | None = None
        description: str | None = None
        value: int | None = None

    @dataclass(slots=True)
    class Output(io):
        media_id: str | None = None
        insights: list[Insight] | None = None
        total_insights: int | None = None


@dataclass(slots=True, kw_only=True)
class Insight:
    name: str | None = None
    period: str | None = None
    title: str | None = None
    description: str | None = None
    value: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    media_id: str | None = None
    insights: list[Insight] | None = None
    total_insights: int | None = None
