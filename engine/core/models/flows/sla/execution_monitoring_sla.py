from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\sla\ExecutionMonitoringSLA.java

from datetime import timedelta
from typing import Any, Protocol


class ExecutionMonitoringSLA(Protocol):
    def get_duration(self) -> timedelta: ...
