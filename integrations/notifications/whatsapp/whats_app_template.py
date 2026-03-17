from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput
from integrations.notifications.whatsapp.whats_app_incoming_webhook import WhatsAppIncomingWebhook


@dataclass(slots=True, kw_only=True)
class WhatsAppTemplate(WhatsAppIncomingWebhook):
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None
    profile_name: Property[str] | None = None
    whats_app_ids: Property[list[String]] | None = None
    from: Property[str] | None = None
    message_id: Property[str] | None = None
    text_body: Property[str] | None = None
    recipient_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
