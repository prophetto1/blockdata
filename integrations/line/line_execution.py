from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-line\src\main\java\io\kestra\plugin\line\LineExecution.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.notifications.execution_interface import ExecutionInterface
from integrations.line.line_template import LineTemplate
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class LineExecution(LineTemplate):
    """Send a LINE message with the execution information."""
    execution_id: Property[str] = Property.ofExpression("{{ execution.id }}")
    custom_fields: Property[dict[str, Any]] | None = None
    custom_message: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
