from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\conversations\Open.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from integrations.slack.app.models.conversation_output import ConversationOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Open(AbstractSlackClientConnection):
    """Open a DM or MPIM"""
    return_im: Property[bool] = Property.ofValue(false)
    users: Property[list[str]] | None = None
    channel: Property[str] | None = None

    def run(self, run_context: RunContext) -> ConversationOutput:
        raise NotImplementedError  # TODO: translate from Java
