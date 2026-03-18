from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\statistics\DailyExecutionStatistics.java
# WARNING: Unresolved types: java, time

from dataclasses import dataclass, field
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class DailyExecutionStatistics:
    start_date: datetime
    duration: timedelta
    execution_counts: dict[State.Type, int] = field(default_factory=dict)
    group_by: str | None = None

    @dataclass(slots=True)
    class Duration:
        min: java.time.Duration
        avg: java.time.Duration
        max: java.time.Duration
        sum: java.time.Duration
        count: int
