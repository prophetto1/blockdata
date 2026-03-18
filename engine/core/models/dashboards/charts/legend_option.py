from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\dashboards\charts\LegendOption.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class LegendOption:
    enabled: bool = True
