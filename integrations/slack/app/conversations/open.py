from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from integrations.slack.app.models.conversation_output import ConversationOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Open(AbstractSlackClientConnection, RunnableTask):
    """Open a DM or MPIM"""
    users: Property[list[String]] | None = None
    channel: Property[str] | None = None
    return_im: Property[bool] | None = None

    def run(self, run_context: RunContext) -> ConversationOutput:
        raise NotImplementedError  # TODO: translate from Java
