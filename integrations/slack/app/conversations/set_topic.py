from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from integrations.slack.app.models.conversation_topic_output import ConversationTopicOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class SetTopic(AbstractSlackClientConnection, RunnableTask):
    """Set Slack channel topic"""
    channel: Property[str]
    topic: Property[str]

    def run(self, run_context: RunContext) -> ConversationTopicOutput:
        raise NotImplementedError  # TODO: translate from Java
