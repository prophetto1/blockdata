from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\AbstractCreateTask.java
# WARNING: Unresolved types: core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.hubspot.hubspot_connection import HubspotConnection
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractCreateTask(ABC, HubspotConnection):
    additional_properties: Property[dict[str, Any]] | None = None

    @dataclass(slots=True)
    class Output:
        id: int | None = None
        uri: str | None = None
