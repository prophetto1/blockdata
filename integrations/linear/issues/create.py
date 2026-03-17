from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.linear.linear_connection import LinearConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(LinearConnection, RunnableTask):
    """Create an issue in Linear"""
    team: Property[str] | None = None
    title: Property[str] | None = None
    description: str | None = None
    labels: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> Create:
        raise NotImplementedError  # TODO: translate from Java

    def get_labels_ids(self, run_context: RunContext) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    def get_team_id(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_input_query(self, team_id: str, title: str, description: str, labels: list[String]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        is_success: bool | None = None
        issue_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    is_success: bool | None = None
    issue_id: str | None = None
