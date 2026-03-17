from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\facebook\enums\Period.java

from enum import Enum
from typing import Any


class Period(str, Enum):
    DAY = "DAY"
    WEEK = "WEEK"
    DAYS_28 = "DAYS_28"
    MONTH = "MONTH"
    LIFETIME = "LIFETIME"
    TOTAL_OVER_RANGE = "TOTAL_OVER_RANGE"
