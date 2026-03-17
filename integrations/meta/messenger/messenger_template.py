from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.meta.abstract_meta_connection import AbstractMetaConnection
from integrations.notifications.messenger.messaging_type import MessagingType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class MessengerTemplate(AbstractMetaConnection):
    page_id: str
    access_token: str
    recipient_ids: Property[list[String]]
    messaging_type: Property[MessagingType] | None = None
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None
    text_body: Property[str] | None = None
    url: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def get_message_text(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
