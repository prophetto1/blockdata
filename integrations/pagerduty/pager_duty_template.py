from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pagerduty\src\main\java\io\kestra\plugin\pagerduty\PagerDutyTemplate.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.notifications.pagerduty.pager_duty_alert import PagerDutyAlert
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class PagerDutyTemplate(ABC, PagerDutyAlert):
    template_uri: Property[str] | None = None
    template_render_map: Property[dict[str, Any]] | None = None
    routing_key: Property[str] | None = None
    deduplication_key: Property[str] | None = None
    event_action: Property[str] | None = None
    payload_summary: str | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
