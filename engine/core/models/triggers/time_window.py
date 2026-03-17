from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\TimeWindow.java

from dataclasses import dataclass
from datetime import time
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class TimeWindow:
    type: TimeWindow.Type = TimeWindow.Type.DURATION_WINDOW
    deadline: time | None = None
    window: timedelta | None = None
    window_advance: timedelta | None = None
    start_time: time | None = None
    end_time: time | None = None

    class Type(str, Enum):
        DAILY_TIME_DEADLINE = "DAILY_TIME_DEADLINE"
        DAILY_TIME_WINDOW = "DAILY_TIME_WINDOW"
        DURATION_WINDOW = "DURATION_WINDOW"
        SLIDING_WINDOW = "SLIDING_WINDOW"
