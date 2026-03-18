from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\statistics\ExecutionStatistics.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class ExecutionStatistics:
    state_current: str
    date: datetime
    count: int
    duration_min: int
    duration_max: int
    duration_sum: int
