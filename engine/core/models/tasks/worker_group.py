from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\WorkerGroup.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class WorkerGroup:
    key: str | None = None
    fallback: Fallback | None = None

    class Fallback(str, Enum):
        FAIL = "FAIL"
        WAIT = "WAIT"
        CANCEL = "CANCEL"
