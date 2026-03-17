from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\statistics\LogStatistics.java
# WARNING: Unresolved types: Level

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class LogStatistics:
    timestamp: datetime
    counts: dict[Level, int] = field(default_factory=dict)
    group_by: str | None = None
