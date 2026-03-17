from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-linkedin\src\main\java\io\kestra\plugin\linkedin\GetPostAnalytics.java
# WARNING: Unresolved types: Exception, JsonNode, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.linkedin.abstract_linkedin_task import AbstractLinkedinTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GetPostAnalytics(AbstractLinkedinTask):
    """Fetch LinkedIn post reactions"""
    activity_urns: Property[list[str]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def parse_post_reactions(self, activity_urn: str, json_response: JsonNode) -> PostReactionsData:
        raise NotImplementedError  # TODO: translate from Java

    def parse_reaction_element(self, reaction_obj: JsonNode) -> ReactionData:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        posts: list[PostReactionsData] | None = None
        total_posts: int | None = None
        total_reactions: int | None = None

    @dataclass(slots=True)
    class PostReactionsData:
        activity_urn: str | None = None
        total_reactions: int | None = None
        reactions: list[ReactionData] | None = None
        reactions_summary: dict[str, int] | None = None
        error: str | None = None

    @dataclass(slots=True)
    class ReactionData:
        reaction_id: str | None = None
        reaction_type: str | None = None
        actor_urn: str | None = None
        root_urn: str | None = None
        created_time: int | None = None
        last_modified_time: int | None = None
        impersonator_urn: str | None = None
