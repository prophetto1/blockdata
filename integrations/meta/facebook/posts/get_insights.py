from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\facebook\posts\GetInsights.java
# WARNING: Unresolved types: Exception, JsonNode, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.meta.facebook.abstract_facebook_task import AbstractFacebookTask
from integrations.meta.facebook.enums.date_preset import DatePreset
from engine.core.http.client.http_client import HttpClient
from integrations.meta.facebook.enums.period import Period
from integrations.meta.facebook.enums.post_metric import PostMetric
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class GetInsights(AbstractFacebookTask):
    """Collect Facebook post insights"""
    post_ids: Property[java.util.List[str]]
    date_preset: Property[DatePreset] = Property.ofValue(DatePreset.TODAY)
    metrics: Property[java.util.List[PostMetric]] = Property.ofValue(Arrays.asList(
        PostMetric.POST_REACTIONS_LIKE_TOTAL,
        PostMetric.POST_REACTIONS_LOVE_TOTAL,
        PostMetric.POST_REACTIONS_WOW_TOTAL,
        PostMetric.POST_REACTIONS_HAHA_TOTAL,
        PostMetric.POST_REACTIONS_SORRY_TOTAL,
        PostMetric.POST_REACTIONS_ANGER_TOTAL))
    period: Property[Period] = Property.ofValue(Period.LIFETIME)
    since: Property[str] = Property.ofValue(LocalDate.now().toString())
    until: Property[str] = Property.ofValue(LocalDate.now().toString())

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_post_insights(self, run_context: RunContext, http_client: HttpClient, post_id: str) -> PostInsightsData:
        raise NotImplementedError  # TODO: translate from Java

    def parse_post_insights(self, post_id: str, response_json: JsonNode, period: str) -> PostInsightsData:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        posts: java.util.List[PostInsightsData] | None = None
        total_posts: int | None = None
        total_insights: int | None = None

    @dataclass(slots=True)
    class PostInsightsData:
        post_id: str | None = None
        total_insights: int | None = None
        insights: java.util.List[dict[str, Any]] | None = None
        insights_summary: dict[str, Any] | None = None
        period: str | None = None
        error: str | None = None
