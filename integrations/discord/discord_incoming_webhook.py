from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-discord\src\main\java\io\kestra\plugin\discord\DiscordIncomingWebhook.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.discord.abstract_discord_connection import AbstractDiscordConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class DiscordIncomingWebhook(AbstractDiscordConnection):
    """Send a Discord message using an Incoming Webhook."""
    url: str
    payload: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
