from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\service\consumer\ConsumerContext.java
# WARNING: Unresolved types: Logger

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.azure.eventhubs.service.event_data_object_converter import EventDataObjectConverter


@dataclass(slots=True, kw_only=True)
class ConsumerContext:
    max_poll_events: int | None = None
    max_batch_partition_wait: timedelta | None = None
    max_duration: timedelta | None = None
    converter: EventDataObjectConverter | None = None
    logger: Logger | None = None
