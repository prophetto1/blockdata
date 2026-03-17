from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\WorkerTaskRestartStrategy.java

from enum import Enum
from typing import Any


class WorkerTaskRestartStrategy(str, Enum):
    NEVER = "NEVER"
    IMMEDIATELY = "IMMEDIATELY"
    AFTER_TERMINATION_GRACE_PERIOD = "AFTER_TERMINATION_GRACE_PERIOD"
