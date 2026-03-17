from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.hubspot.hubspot_connection import HubspotConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractSearchTask(HubspotConnection):
    query: Property[str] | None = None
    filter_groups: Property[list[Map[String, Object]]] | None = None
    properties: Property[list[String]] | None = None
    limit: Property[int] | None = None
    after: Property[str] | None = None
    sorts: Property[list[Map[String, String]]] | None = None
    fetch_all_pages: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        total: int | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    total: int | None = None
    uri: str | None = None
