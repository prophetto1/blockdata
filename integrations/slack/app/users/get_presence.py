from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\users\GetPresence.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GetPresence(AbstractSlackClientConnection):
    """Get Slack user presence"""
    user: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        presence: str | None = None
        online: bool | None = None
        auto_away: bool | None = None
        manual_away: bool | None = None
        connection_count: int | None = None
        last_activity: int | None = None
