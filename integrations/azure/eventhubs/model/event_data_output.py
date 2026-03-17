from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.eventhubs.model.event_data_object import EventDataObject
from engine.core.models.tasks.output import Output


@dataclass(slots=True, kw_only=True)
class EventDataOutput(Output):
    partition_key: str | None = None
    body: Any | None = None
    content_type: str | None = None
    correlation_id: str | None = None
    message_id: str | None = None
    enqueued_timestamp: int | None = None
    offset: int | None = None
    sequence_number: int | None = None
    properties: dict[String, Object] | None = None

    def of(self, event: EventDataObject) -> EventDataOutput:
        raise NotImplementedError  # TODO: translate from Java
