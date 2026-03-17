from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.meta.facebook.abstract_facebook_task import AbstractFacebookTask
from integrations.meta.facebook.enums.date_preset import DatePreset
from engine.core.http.client.http_client import HttpClient
from integrations.meta.facebook.enums.period import Period
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class GetInsights(AbstractFacebookTask):
    """Collect Facebook post insights"""
    post_ids: Property[java]
    date_preset: Property[DatePreset] | None = None
    metrics: Property[java] | None = None
    period: Property[Period] | None = None
    since: Property[str] | None = None
    until: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_post_insights(self, run_context: RunContext, http_client: HttpClient, post_id: str) -> PostInsightsData:
        raise NotImplementedError  # TODO: translate from Java

    def parse_post_insights(self, post_id: str, response_json: JsonNode, period: str) -> PostInsightsData:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        posts: java | None = None
        total_posts: int | None = None
        total_insights: int | None = None

    @dataclass(slots=True)
    class PostInsightsData:
        post_id: str | None = None
        total_insights: int | None = None
        insights: java | None = None
        insights_summary: dict[String, Object] | None = None
        period: str | None = None
        error: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    posts: java | None = None
    total_posts: int | None = None
    total_insights: int | None = None


@dataclass(slots=True, kw_only=True)
class PostInsightsData:
    post_id: str | None = None
    total_insights: int | None = None
    insights: java | None = None
    insights_summary: dict[String, Object] | None = None
    period: str | None = None
    error: str | None = None
