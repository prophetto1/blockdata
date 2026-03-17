from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-linkedin\src\main\java\io\kestra\plugin\linkedin\CommentTrigger.java
# WARNING: Unresolved types: Exception, JsonNode, core, io, kestra, models, tasks

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
    """Trigger on new LinkedIn comments"""
    access_token: Property[str]
    post_urns: Property[list[str]]
    interval: timedelta = Duration.ofMinutes(30)
    linkedin_version: Property[str] = Property.ofValue("202509")
    application_name: Property[str] = Property.ofValue("kestra-linkedin-plugin")

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_comment_data(self, post_urn: str, comment_obj: JsonNode, last_check_time: datetime) -> CommentData:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        post_urn: str | None = None
        comment_id: str | None = None
        comment_urn: str | None = None
        comment_text: str | None = None
        actor_urn: str | None = None
        agent_urn: str | None = None
        created_time: datetime | None = None
        new_comments_count: int | None = None
        all_new_comments: list[CommentData] | None = None

    @dataclass(slots=True)
    class CommentData:
        post_urn: str | None = None
        comment_id: str | None = None
        comment_urn: str | None = None
        comment_text: str | None = None
        actor_urn: str | None = None
        agent_urn: str | None = None
        created_time: datetime | None = None
