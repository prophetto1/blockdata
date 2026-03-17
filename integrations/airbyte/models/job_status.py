from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\JobStatus.java

from enum import Enum
from typing import Any


class JobStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    INCOMPLETE = "INCOMPLETE"
    FAILED = "FAILED"
    SUCCEEDED = "SUCCEEDED"
    CANCELLED = "CANCELLED"
