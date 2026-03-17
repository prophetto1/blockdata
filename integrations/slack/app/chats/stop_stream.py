from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class StopStream(AbstractSlackClientConnection, RunnableTask):
    """Stop a Slack stream"""
    channel: Property[str]
    timestamp: Property[str]
    markdown_text: Property[str] | None = None
    blocks: Property[str] | None = None
    metadata: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        timestamp: str | None = None
        channel: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    timestamp: str | None = None
    channel: str | None = None
