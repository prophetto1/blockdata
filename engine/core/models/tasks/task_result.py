from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\TaskResult.java

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class TaskResult:
    state: State | None = None
    start: datetime | None = None
    duration: timedelta | None = None
