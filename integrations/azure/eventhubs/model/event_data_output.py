from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\model\EventDataOutput.java

from dataclasses import dataclass
from typing import Any

from integrations.azure.eventhubs.model.event_data_object import EventDataObject
from integrations.aws.glue.model.output import Output


@dataclass(slots=True, kw_only=True)
class EventDataOutput:
    partition_key: str | None = None
    body: Any | None = None
    content_type: str | None = None
    correlation_id: str | None = None
    message_id: str | None = None
    enqueued_timestamp: int | None = None
    offset: int | None = None
    sequence_number: int | None = None
    properties: dict[str, Any] | None = None

    @staticmethod
    def of(event: EventDataObject) -> EventDataOutput:
        raise NotImplementedError  # TODO: translate from Java
