from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\TimeWindow.java

from dataclasses import dataclass
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class TimeWindow:
    default_duration: timedelta = Duration.ofDays(30)
    max: timedelta = Duration.ofDays(366)
