from __future__ import annotations

from typing import Any, Protocol


class EventDataBatchFactory(Protocol):
    def create_batch(self, client: EventHubProducerAsyncClient) -> Mono[EventDataBatch]: ...
