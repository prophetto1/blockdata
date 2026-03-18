from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opsgenie\src\main\java\io\kestra\plugin\opsgenie\OpsgenieTemplate.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.notifications.opsgenie.opsgenie_alert import OpsgenieAlert
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class OpsgenieTemplate(ABC, OpsgenieAlert):
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[str, Any]] | None = None
    message: Property[str] | None = None
    alias: Property[str] | None = None
    responders: Property[dict[str, str]] | None = None
    visible_to: Property[dict[str, str]] | None = None
    tags: Property[list[str]] | None = None
    priority: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
