from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ClusterEvent.java

from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from typing import Any

from engine.core.models.has_uid import HasUID


@dataclass(slots=True, kw_only=True)
class ClusterEvent:
    uid: str | None = None
    event_type: EventType | None = None
    event_date: datetime | None = None
    message: str | None = None

    class EventType(str, Enum):
        MAINTENANCE_ENTER = "MAINTENANCE_ENTER"
        MAINTENANCE_EXIT = "MAINTENANCE_EXIT"
        PLUGINS_SYNC_REQUESTED = "PLUGINS_SYNC_REQUESTED"
        KILL_SWITCH_SYNC_REQUESTED = "KILL_SWITCH_SYNC_REQUESTED"
