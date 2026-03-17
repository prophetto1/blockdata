from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-squadcast\src\main\java\io\kestra\plugin\squadcast\SquadcastTemplate.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.notifications.squadcast.squadcast_incoming_webhook import SquadcastIncomingWebhook
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SquadcastTemplate(ABC, SquadcastIncomingWebhook):
    message: Property[str]
    priority: Property[str] | None = None
    event_id: Property[str] | None = None
    status: Property[str] | None = None
    tags: Property[dict[str, str]] | None = None
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
