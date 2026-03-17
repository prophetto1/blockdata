from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


class AccessLevel(str, Enum):
    READ = "READ"
    WRITE = "WRITE"


@dataclass(slots=True, kw_only=True)
class AccessSet(AbstractSlackClientConnection, RunnableTask):
    """Set canvas access controls"""
    canvas_id: Property[str]
    access_level: Property[AccessLevel]
    channel_ids: Property[list[String]] | None = None
    user_ids: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
