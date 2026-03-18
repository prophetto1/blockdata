from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\slack\SlackTemplate.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.notifications.slack.slack_incoming_webhook import SlackIncomingWebhook
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SlackTemplate(ABC, SlackIncomingWebhook):
    channel: Property[str] | None = None
    username: Property[str] | None = None
    icon_url: Property[str] | None = None
    icon_emoji: Property[str] | None = None
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
