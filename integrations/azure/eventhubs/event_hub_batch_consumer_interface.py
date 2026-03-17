from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\EventHubBatchConsumerInterface.java

from datetime import timedelta
from typing import Any, Protocol

from engine.core.models.property.property import Property


class EventHubBatchConsumerInterface(Protocol):
    def get_max_batch_size_per_partition(self) -> Property[int]: ...

    def get_max_wait_time_per_partition(self) -> Property[timedelta]: ...

    def get_max_duration(self) -> Property[timedelta]: ...
