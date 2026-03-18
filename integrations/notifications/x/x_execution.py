from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\x\XExecution.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.notifications.execution_interface import ExecutionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput
from integrations.notifications.x.x_template import XTemplate


@dataclass(slots=True, kw_only=True)
class XExecution(XTemplate):
    """Send an X (Twitter) post with execution information."""
    execution_id: Property[str] = Property.ofExpression("{{ execution.id }}")
    custom_fields: Property[dict[str, Any]] | None = None
    custom_message: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
