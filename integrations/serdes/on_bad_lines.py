from __future__ import annotations

from enum import Enum
from typing import Any


class OnBadLines(str, Enum):
    ERROR = "ERROR"
    WARN = "WARN"
    SKIP = "SKIP"
