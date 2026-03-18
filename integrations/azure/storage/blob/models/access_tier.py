from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\models\AccessTier.java

from enum import Enum
from typing import Any


class AccessTier(str, Enum):
    P4 = "P4"
    P6 = "P6"
    P10 = "P10"
    P15 = "P15"
    P20 = "P20"
    P30 = "P30"
    P40 = "P40"
    P50 = "P50"
    P60 = "P60"
    P70 = "P70"
    P80 = "P80"
    HOT = "HOT"
    COOL = "COOL"
    ARCHIVE = "ARCHIVE"
