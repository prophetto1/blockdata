from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\statistics\Flow.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Flow:
    namespace: str
    flow_id: str
