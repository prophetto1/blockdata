from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.microsoft365.teams.abstract_teams_connection import AbstractTeamsConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class TeamsIncomingWebhook(AbstractTeamsConnection):
    """Send message via Teams incoming webhook"""
    url: str | None = None
    payload: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
