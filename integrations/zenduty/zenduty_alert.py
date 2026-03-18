from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-zenduty\src\main\java\io\kestra\plugin\zenduty\ZendutyAlert.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.zenduty.abstract_zenduty_connection import AbstractZendutyConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class ZendutyAlert(AbstractZendutyConnection):
    """Send Zenduty alert payload"""
    url: str
    payload: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
