from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\chats\Update.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from integrations.slack.app.chats.chat_interface import ChatInterface
from integrations.slack.message_payload_interface import MessagePayloadInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Update(AbstractSlackClientConnection):
    """Update a Slack message"""
    timestamp: Property[datetime]
    payload: Property[str] | None = None
    message_text: Property[str] | None = None
    channel: Property[str] | None = None
    username: Property[str] | None = None
    icon_url: Property[str] | None = None
    icon_emoji: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        timestamp: str
