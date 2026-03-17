from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\conversations\SetPurpose.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from integrations.slack.app.models.conversation_topic_output import ConversationTopicOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class SetPurpose(AbstractSlackClientConnection):
    """Set Slack channel purpose"""
    channel: Property[str]
    purpose: Property[str]

    def run(self, run_context: RunContext) -> ConversationTopicOutput:
        raise NotImplementedError  # TODO: translate from Java
