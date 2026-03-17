from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.hubspot.hubspot_connection import HubspotConnection
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class AbstractDeleteTask(HubspotConnection):

    def run(self, run_context: RunContext, record_id: str) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
