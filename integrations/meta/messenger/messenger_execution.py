from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.plugins.notifications.execution_interface import ExecutionInterface
from integrations.notifications.messenger.messenger_template import MessengerTemplate
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class MessengerExecution(MessengerTemplate, ExecutionInterface):
    """Send execution summary via Messenger"""
    execution_id: Property[str] | None = None
    custom_fields: Property[dict[String, Object]] | None = None
    custom_message: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
