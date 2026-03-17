from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.slack.app.models.user_output import UserOutput


@dataclass(slots=True, kw_only=True)
class Info(AbstractSlackClientConnection, RunnableTask):
    """Get Slack user details"""
    user: Property[str]
    include_locale: Property[bool] | None = None

    def run(self, run_context: RunContext) -> UserOutput:
        raise NotImplementedError  # TODO: translate from Java
