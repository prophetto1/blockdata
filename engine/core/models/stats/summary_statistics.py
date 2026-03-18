from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\stats\SummaryStatistics.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class SummaryStatistics:
    flows: int | None = None
    triggers: int | None = None
