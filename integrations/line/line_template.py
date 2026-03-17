from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-line\src\main\java\io\kestra\plugin\line\LineTemplate.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.line.abstract_line_connection import AbstractLineConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class LineTemplate(ABC, AbstractLineConnection):
    """Send a LINE broadcast message"""
    channel_access_token: Property[str]
    url: Property[str] = Property.ofValue("https://api.line.me/v2/bot/message/broadcast")
    execution_id: Property[str] = Property.ofExpression("{{ execution.id }}")
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[str, Any]] | None = None
    text_body: Property[str] | None = None
    custom_fields: Property[dict[str, Any]] | None = None
    custom_message: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_message_text(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
