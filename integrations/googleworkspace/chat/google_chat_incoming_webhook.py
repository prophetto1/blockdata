from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.chat.abstract_chat_connection import AbstractChatConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class GoogleChatIncomingWebhook(AbstractChatConnection):
    """Send Google Chat message via webhook"""
    url: str | None = None
    payload: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
