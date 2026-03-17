from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opsgenie.opsgenie_alert import OpsgenieAlert
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class OpsgenieTemplate(OpsgenieAlert):
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None
    message: Property[str] | None = None
    alias: Property[str] | None = None
    responders: Property[dict[String, String]] | None = None
    visible_to: Property[dict[String, String]] | None = None
    tags: Property[list[String]] | None = None
    priority: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
