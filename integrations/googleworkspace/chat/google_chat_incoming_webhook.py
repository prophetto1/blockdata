from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\chat\GoogleChatIncomingWebhook.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.googleworkspace.chat.abstract_chat_connection import AbstractChatConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class GoogleChatIncomingWebhook(AbstractChatConnection):
    """Send Google Chat message via webhook"""
    url: str
    payload: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
