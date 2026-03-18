from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\canvases\AccessSet.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class AccessSet(AbstractSlackClientConnection):
    """Set canvas access controls"""
    canvas_id: Property[str]
    access_level: Property[AccessLevel]
    channel_ids: Property[list[str]] | None = None
    user_ids: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    class AccessLevel(str, Enum):
        READ = "READ"
        WRITE = "WRITE"
