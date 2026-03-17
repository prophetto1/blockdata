from __future__ import annotations

from enum import Enum
from typing import Any


class AttemptStatus(str, Enum):
    RUNNING = "RUNNING"
    FAILED = "FAILED"
    SUCCEEDED = "SUCCEEDED"
