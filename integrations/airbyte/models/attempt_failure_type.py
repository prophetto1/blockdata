from __future__ import annotations

from enum import Enum
from typing import Any


class AttemptFailureType(str, Enum):
    CONFIG_ERROR = "CONFIG_ERROR"
    SYSTEM_ERROR = "SYSTEM_ERROR"
    MANUAL_CANCELLATION = "MANUAL_CANCELLATION"
