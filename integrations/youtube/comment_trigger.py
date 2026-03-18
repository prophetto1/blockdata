from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-youtube\src\main\java\io\kestra\plugin\youtube\CommentTrigger.java
# WARNING: Unresolved types: Exception, YouTube, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class CommentTrigger(AbstractTrigger):
    """Trigger a flow on new YouTube comments."""
    access_token: Property[str]
    video_ids: Property[list[str]]
    interval: timedelta = Duration.ofMinutes(30)
    max_results: Property[int] = Property.ofValue(20)
    order: Property[str] = Property.ofValue("time")
    application_name: Property[str] = Property.ofValue("kestra-yt-plugin")

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def create_youtube_service(self, rendered_access_token: str, rendered_application_name: str) -> YouTube:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
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
