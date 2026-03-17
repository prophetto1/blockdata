from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pagerduty\src\main\java\io\kestra\plugin\pagerduty\PagerDutyAlert.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.pagerduty.abstract_pager_duty_connection import AbstractPagerDutyConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class PagerDutyAlert(AbstractPagerDutyConnection):
    """Send PagerDuty alert from errors task"""
    url: str
    payload: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
