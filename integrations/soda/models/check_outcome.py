from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-soda\src\main\java\io\kestra\plugin\soda\models\CheckOutcome.java

from enum import Enum
from typing import Any


class CheckOutcome(str, Enum):
    pass = "pass"
    warn = "warn"
    fail = "fail"
