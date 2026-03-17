from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\AbstractSearchTask.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.hubspot.hubspot_connection import HubspotConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractSearchTask(ABC, HubspotConnection):
    limit: Property[int] = Property.ofValue(10)
    fetch_all_pages: Property[bool] = Property.ofValue(false)
    query: Property[str] | None = None
    filter_groups: Property[list[dict[str, Any]]] | None = None
    properties: Property[list[str]] | None = None
    after: Property[str] | None = None
    sorts: Property[list[dict[str, str]]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        total: int | None = None
        uri: str | None = None
