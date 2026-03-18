from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\TestState.java

from enum import Enum
from typing import Any


class TestState(str, Enum):
    ERROR = "ERROR"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
