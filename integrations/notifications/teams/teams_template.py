from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.notifications.teams.teams_incoming_webhook import TeamsIncomingWebhook
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class TeamsTemplate(TeamsIncomingWebhook):
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None
    theme_color: Property[str] | None = None
    activity_title: Property[str] | None = None
    activity_subtitle: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
