from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.notifications.abstract_http_options_task import AbstractHttpOptionsTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class LineTemplate(AbstractHttpOptionsTask):
    """Send a LINE broadcast message"""
    url: Property[str] | None = None
    channel_access_token: Property[str]
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None
    text_body: Property[str] | None = None
    custom_fields: Property[dict[String, Object]] | None = None
    custom_message: Property[str] | None = None
    execution_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_message_text(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
