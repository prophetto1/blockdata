from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class StartStream(AbstractSlackClientConnection, RunnableTask):
    """Start a streaming Slack message"""
    channel: Property[str] | None = None
    markdown_text: Property[str] | None = None
    timestamp: Property[str] | None = None
    recipient_user_id: Property[str] | None = None
    recipient_team_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        timestamp: str
        channel: str


@dataclass(slots=True, kw_only=True)
class Output(io):
    timestamp: str
    channel: str
