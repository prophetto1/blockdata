from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\statistics\ExecutionCount.java

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True, kw_only=True)
class ExecutionCount:
    namespace: str
    count: int
    flow_id: str | None = None
