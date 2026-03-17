from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\service\EventDataObjectConverter.java
# WARNING: Unresolved types: EventData

from dataclasses import dataclass
from typing import Any

from integrations.azure.eventhubs.model.event_data_object import EventDataObject
from integrations.azure.eventhubs.serdes.serde import Serde


@dataclass(slots=True, kw_only=True)
class EventDataObjectConverter:
    serde: Serde | None = None

    def convert_from_event_data(self, data: list[EventData]) -> list[EventDataObject]:
        raise NotImplementedError  # TODO: translate from Java

    def convert_to_event_data(self, data: EventDataObject) -> EventData:
        raise NotImplementedError  # TODO: translate from Java

    def convert_from_event_data(self, data: EventData) -> EventDataObject:
        raise NotImplementedError  # TODO: translate from Java
