from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-singer\src\main\java\io\kestra\plugin\singer\models\Metric.java

from dataclasses import dataclass
from enum import Enum
from typing import Any


@dataclass(slots=True, kw_only=True)
class Metric:
    type: Type | None = None
    metric: str | None = None
    value: float | None = None
    tags: dict[str, Any] | None = None

    class Type(str, Enum):
        counter = "counter"
        timer = "timer"
