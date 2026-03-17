from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput
from integrations.zulip.zulip_incoming_webhook import ZulipIncomingWebhook


@dataclass(slots=True, kw_only=True)
class ZulipTemplate(ZulipIncomingWebhook):
    channel: Property[str] | None = None
    username: Property[str] | None = None
    icon_url: Property[str] | None = None
    icon_emoji: Property[str] | None = None
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
