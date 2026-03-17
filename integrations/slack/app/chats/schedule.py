from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from integrations.slack.app.chats.chat_interface import ChatInterface
from integrations.slack.message_payload_interface import MessagePayloadInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Schedule(AbstractSlackClientConnection, RunnableTask, MessagePayloadInterface, ChatInterface):
    """Schedule a Slack message"""
    payload: Property[str] | None = None
    message_text: Property[str] | None = None
    channel: Property[str] | None = None
    timestamp: Property[datetime] | None = None
    username: Property[str] | None = None
    icon_url: Property[str] | None = None
    icon_emoji: Property[str] | None = None
    post_at: Property[datetime]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        message_id: str
        post_at: int


@dataclass(slots=True, kw_only=True)
class Output(io):
    message_id: str
    post_at: int
