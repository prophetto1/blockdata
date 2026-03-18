from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\metrics\MetricAggregation.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class MetricAggregation:
    name: str
    date: datetime
    value: float | None = None
