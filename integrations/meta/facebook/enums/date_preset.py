from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\facebook\enums\DatePreset.java

from enum import Enum
from typing import Any


class DatePreset(str, Enum):
    TODAY = "TODAY"
    YESTERDAY = "YESTERDAY"
    THIS_MONTH = "THIS_MONTH"
    LAST_MONTH = "LAST_MONTH"
    THIS_QUARTER = "THIS_QUARTER"
    MAXIMUM = "MAXIMUM"
    LAST_3D = "LAST_3D"
    LAST_7D = "LAST_7D"
    LAST_14D = "LAST_14D"
    LAST_28D = "LAST_28D"
    LAST_30D = "LAST_30D"
    LAST_90D = "LAST_90D"
    LAST_WEEK_MON_SUN = "LAST_WEEK_MON_SUN"
    LAST_WEEK_SUN_SAT = "LAST_WEEK_SUN_SAT"
    LAST_QUARTER = "LAST_QUARTER"
    LAST_YEAR = "LAST_YEAR"
    THIS_WEEK_MON_TODAY = "THIS_WEEK_MON_TODAY"
    THIS_WEEK_SUN_TODAY = "THIS_WEEK_SUN_TODAY"
    THIS_YEAR = "THIS_YEAR"
