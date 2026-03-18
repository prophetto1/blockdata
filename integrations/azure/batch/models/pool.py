from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\models\Pool.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Pool:
    id: str
    target_dedicated_nodes: int | None = None
    target_low_priority_nodes: int | None = None
