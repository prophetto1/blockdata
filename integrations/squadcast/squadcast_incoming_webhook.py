from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.squadcast.abstract_squadcast_connection import AbstractSquadcastConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SquadcastIncomingWebhook(AbstractSquadcastConnection):
    """Send Squadcast alert via webhook"""
    url: str | None = None
    payload: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
