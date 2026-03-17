from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\reactions\Remove.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Remove(AbstractSlackClientConnection):
    """Remove a Slack reaction"""
    channel: Property[str]
    name: Property[str]
    timestamp: Property[datetime]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
