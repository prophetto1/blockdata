from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.plugins.notifications.execution_interface import ExecutionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.squadcast.squadcast_template import SquadcastTemplate
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SquadcastExecution(SquadcastTemplate, ExecutionInterface):
    """Send a Squadcast message with the execution information."""
    execution_id: Property[str] | None = None
    custom_fields: Property[dict[String, Object]] | None = None
    custom_message: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
