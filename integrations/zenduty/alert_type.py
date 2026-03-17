from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-zenduty\src\main\java\io\kestra\plugin\zenduty\AlertType.java

from enum import Enum
from typing import Any


class AlertType(str, Enum):
    CRITICAL = "CRITICAL"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"
