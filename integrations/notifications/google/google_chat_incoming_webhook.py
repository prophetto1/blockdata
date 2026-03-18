from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\google\GoogleChatIncomingWebhook.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.notifications.abstract_http_options_task import AbstractHttpOptionsTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class GoogleChatIncomingWebhook(AbstractHttpOptionsTask):
    """Send a Google Chat message using an Incoming Webhook."""
    url: str
    payload: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
