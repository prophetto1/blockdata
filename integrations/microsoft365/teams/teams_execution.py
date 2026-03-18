from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\teams\TeamsExecution.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.notifications.execution_interface import ExecutionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.microsoft365.teams.teams_template import TeamsTemplate
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class TeamsExecution(TeamsTemplate):
    """Send Teams notification with execution details"""
    execution_id: Property[str] = Property.ofExpression("{{ execution.id }}")
    custom_fields: Property[dict[str, Any]] | None = None
    custom_message: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
