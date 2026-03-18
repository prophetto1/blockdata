from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\twilio\TwilioTemplate.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.notifications.twilio.twilio_alert import TwilioAlert
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class TwilioTemplate(ABC, TwilioAlert):
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[str, Any]] | None = None
    body: Property[str] | None = None
    identity: Property[str] | None = None
    tag: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
