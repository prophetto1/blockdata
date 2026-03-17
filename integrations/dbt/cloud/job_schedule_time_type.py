from __future__ import annotations

from enum import Enum
from typing import Any


class JobScheduleTimeType(str, Enum):
    EVERY_HOUR = "EVERY_HOUR"
    AT_EXACT_HOURS = "AT_EXACT_HOURS"
