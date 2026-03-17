from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\collectors\PluginMetric.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class PluginMetric:
    type: str | None = None
    count: float | None = None
    total_time: float | None = None
    mean_time: float | None = None
