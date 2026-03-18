from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\sentry\SentryExecution.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.notifications.execution_interface import ExecutionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.notifications.sentry.sentry_template import SentryTemplate
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SentryExecution(SentryTemplate):
    """Send a Sentry alert with the execution information."""
    execution_id: Property[str] = Property.ofExpression("{{ execution.id }}")
    custom_fields: Property[dict[str, Any]] | None = None
    custom_message: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
