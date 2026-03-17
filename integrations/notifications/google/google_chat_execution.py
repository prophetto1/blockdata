from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.plugins.notifications.execution_interface import ExecutionInterface
from integrations.notifications.google.google_chat_template import GoogleChatTemplate
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class GoogleChatExecution(GoogleChatTemplate, ExecutionInterface):
    """Send a Google Chat message with the execution information."""
    execution_id: Property[str] | None = None
    custom_fields: Property[dict[String, Object]] | None = None
    custom_message: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
