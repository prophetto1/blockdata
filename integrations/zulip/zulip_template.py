from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-zulip\src\main\java\io\kestra\plugin\zulip\ZulipTemplate.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput
from integrations.notifications.zulip.zulip_incoming_webhook import ZulipIncomingWebhook


@dataclass(slots=True, kw_only=True)
class ZulipTemplate(ABC, ZulipIncomingWebhook):
    channel: Property[str] | None = None
    username: Property[str] | None = None
    icon_url: Property[str] | None = None
    icon_emoji: Property[str] | None = None
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
