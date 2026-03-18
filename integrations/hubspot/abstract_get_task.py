from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\AbstractGetTask.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.hubspot.hubspot_connection import HubspotConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractGetTask(ABC, HubspotConnection):
    properties: Property[list[str]] | None = None

    def run(self, run_context: RunContext, record_id: str) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        id: int | None = None
        uri: str | None = None
