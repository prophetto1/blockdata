from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\service\producer\EventDataBatchFactory.java
# WARNING: Unresolved types: CreateBatchOptions, EventDataBatch, EventHubProducerAsyncClient, Mono

from dataclasses import dataclass
from typing import Any, Protocol


class EventDataBatchFactory(Protocol):
    def create_batch(self, client: EventHubProducerAsyncClient) -> Mono[EventDataBatch]: ...
