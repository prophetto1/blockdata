from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.squadcast.squadcast_incoming_webhook import SquadcastIncomingWebhook
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SquadcastTemplate(SquadcastIncomingWebhook):
    message: Property[str]
    priority: Property[str] | None = None
    event_id: Property[str] | None = None
    status: Property[str] | None = None
    tags: Property[dict[String, String]] | None = None
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
