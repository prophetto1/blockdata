from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GetPresence(AbstractSlackClientConnection, RunnableTask):
    """Get Slack user presence"""
    user: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        presence: str | None = None
        online: bool | None = None
        auto_away: bool | None = None
        manual_away: bool | None = None
        connection_count: int | None = None
        last_activity: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    presence: str | None = None
    online: bool | None = None
    auto_away: bool | None = None
    manual_away: bool | None = None
    connection_count: int | None = None
    last_activity: int | None = None
