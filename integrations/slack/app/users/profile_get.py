from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\users\ProfileGet.java
# WARNING: Unresolved types: Exception, Profile, User, api, com, core, io, kestra, model, models, slack, tasks

from dataclasses import dataclass
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ProfileGet(AbstractSlackClientConnection):
    """Get Slack user profile"""
    include_labels: Property[bool] = Property.ofValue(false)
    user: Property[str] | None = None

    def run(self, run_context: RunContext) -> ProfileOutput:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ProfileOutput:
        title: str | None = None
        phone: str | None = None
        real_name: str | None = None
        display_name: str | None = None
        email: str | None = None
        status_text: str | None = None
        status_emoji: str | None = None

        @staticmethod
        def of(profile: com.slack.api.model.User.Profile) -> ProfileOutput:
            raise NotImplementedError  # TODO: translate from Java
