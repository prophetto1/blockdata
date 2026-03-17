from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.eventhubs.model.event_data_object import EventDataObject
from integrations.solace.serde.serde import Serde


@dataclass(slots=True, kw_only=True)
class EventDataObjectConverter:
    serde: Serde | None = None

    def convert_from_event_data(self, data: list[EventData]) -> list[EventDataObject]:
        raise NotImplementedError  # TODO: translate from Java

    def convert_to_event_data(self, data: EventDataObject) -> EventData:
        raise NotImplementedError  # TODO: translate from Java

    def convert_from_event_data(self, data: EventData) -> EventDataObject:
        raise NotImplementedError  # TODO: translate from Java
