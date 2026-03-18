from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\AttemptFailureType.java

from enum import Enum
from typing import Any


class AttemptFailureType(str, Enum):
    CONFIG_ERROR = "CONFIG_ERROR"
    SYSTEM_ERROR = "SYSTEM_ERROR"
    MANUAL_CANCELLATION = "MANUAL_CANCELLATION"
