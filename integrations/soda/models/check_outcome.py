from __future__ import annotations

from enum import Enum
from typing import Any


class CheckOutcome(str, Enum):
    pass = "pass"
    warn = "warn"
    fail = "fail"
