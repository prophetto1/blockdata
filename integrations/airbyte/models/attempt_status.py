from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\AttemptStatus.java

from enum import Enum
from typing import Any


class AttemptStatus(str, Enum):
    RUNNING = "RUNNING"
    FAILED = "FAILED"
    SUCCEEDED = "SUCCEEDED"
