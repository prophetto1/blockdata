from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\OnBadLines.java

from enum import Enum
from typing import Any


class OnBadLines(str, Enum):
    """How to handle bad lines (e.g., a line with too many fields)."""
    ERROR = "ERROR"
    WARN = "WARN"
    SKIP = "SKIP"
