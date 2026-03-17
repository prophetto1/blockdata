from __future__ import annotations

from typing import Any, Protocol
from datetime import timedelta

from engine.core.models.property.property import Property


class EventHubBatchConsumerInterface(Protocol):
    def get_max_batch_size_per_partition(self) -> Property[int]: ...
    def get_max_wait_time_per_partition(self) -> Property[timedelta]: ...
    def get_max_duration(self) -> Property[timedelta]: ...
