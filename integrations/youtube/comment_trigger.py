from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class CommentTrigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput):
    """Trigger a flow on new YouTube comments."""
    access_token: Property[str]
    video_ids: Property[list[String]]
    interval: timedelta | None = None
    max_results: Property[int] | None = None
    order: Property[str] | None = None
    application_name: Property[str] | None = None

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def create_youtube_service(self, rendered_access_token: str, rendered_application_name: str) -> YouTube:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        video_id: str | None = None
        comment_id: str | None = None
        text_display: str | None = None
        author_display_name: str | None = None
        published_at: datetime | None = None
        new_comments_count: int | None = None
        all_new_comments: list[CommentData] | None = None

    @dataclass(slots=True)
    class CommentData:
        video_id: str | None = None
        comment_id: str | None = None
        text_display: str | None = None
        author_display_name: str | None = None
        published_at: datetime | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    video_id: str | None = None
    comment_id: str | None = None
    text_display: str | None = None
    author_display_name: str | None = None
    published_at: datetime | None = None
    new_comments_count: int | None = None
    all_new_comments: list[CommentData] | None = None


@dataclass(slots=True, kw_only=True)
class CommentData:
    video_id: str | None = None
    comment_id: str | None = None
    text_display: str | None = None
    author_display_name: str | None = None
    published_at: datetime | None = None
