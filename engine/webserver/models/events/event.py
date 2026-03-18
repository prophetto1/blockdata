from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\models\events\Event.java

from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class Event:
    type: EventType
    iid: str
    uid: str
    date: datetime
    counter: int

    class EventType(str, Enum):
        OSS_AUTH = "OSS_AUTH"
