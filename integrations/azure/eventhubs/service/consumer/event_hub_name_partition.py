from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\service\consumer\EventHubNamePartition.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class EventHubNamePartition:
    event_hub_name: str | None = None
    partition_id: str | None = None
