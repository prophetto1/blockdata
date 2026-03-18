from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opsgenie\src\main\java\io\kestra\plugin\opsgenie\OpsgenieAlert.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.opsgenie.abstract_opsgenie_connection import AbstractOpsgenieConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class OpsgenieAlert(AbstractOpsgenieConnection):
    """Post a custom alert to Opsgenie"""
    url: str
    payload: Property[str] | None = None
    authorization_token: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
