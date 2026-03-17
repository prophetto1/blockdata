from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-soda\src\main\java\io\kestra\plugin\soda\models\Metric.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Metric:
    identity: str | None = None
    metric_name: str | None = None
    value: Any | None = None
