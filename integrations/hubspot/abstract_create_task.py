from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.hubspot.hubspot_connection import HubspotConnection
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractCreateTask(HubspotConnection):
    additional_properties: Property[dict[String, Object]] | None = None

    @dataclass(slots=True)
    class Output(io):
        id: int | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    id: int | None = None
    uri: str | None = None
