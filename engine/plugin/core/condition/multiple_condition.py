from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\MultipleCondition.java
# WARNING: Unresolved types: multipleflows

from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import timedelta
from typing import Any, ClassVar

from engine.core.models.triggers.time_window import TimeWindow


@dataclass(slots=True, kw_only=True)
class MultipleCondition(Condition):
    """Run a flow when multiple preconditions are true within a window (deprecated)."""
    id: str
    time_window: TimeWindow
    conditions: dict[str, Condition]
    logger: ClassVar[Logger] = getLogger(__name__)
    reset_on_success: bool = True
    window: timedelta | None = None
    window_advance: timedelta | None = None

    def logger(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java
