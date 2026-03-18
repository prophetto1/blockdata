from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\conversations\Info.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from integrations.slack.app.models.conversation_output import ConversationOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Info(AbstractSlackClientConnection):
    """Get Slack channel details"""
    channel: Property[str]
    include_locale: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> ConversationOutput:
        raise NotImplementedError  # TODO: translate from Java
