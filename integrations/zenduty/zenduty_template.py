from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.zenduty.alert_type import AlertType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput
from integrations.zenduty.zenduty_alert import ZendutyAlert


@dataclass(slots=True, kw_only=True)
class ZendutyTemplate(ZendutyAlert):
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[String, Object]] | None = None
    message: Property[str] | None = None
    summary: Property[str] | None = None
    alert_type: Property[AlertType] | None = None
    entity_id: Property[str] | None = None
    urls: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
