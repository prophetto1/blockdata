from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.hubspot.hubspot_connection import HubspotConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractGetTask(HubspotConnection):
    properties: Property[list[String]] | None = None

    def run(self, run_context: RunContext, record_id: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        id: int | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    id: int | None = None
    uri: str | None = None
