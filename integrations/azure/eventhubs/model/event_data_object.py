from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\model\EventDataObject.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class EventDataObject:
    partition_key: str | None = None
    body: Any | None = None
    content_type: str | None = None
    correlation_id: str | None = None
    message_id: str | None = None
    enqueued_timestamp: int | None = None
    offset: int | None = None
    sequence_number: int | None = None
    properties: dict[str, Any] | None = None
