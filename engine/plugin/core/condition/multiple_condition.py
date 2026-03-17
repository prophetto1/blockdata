from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\MultipleCondition.java
# WARNING: Unresolved types: Logger, core, io, kestra, models, multipleflows, triggers

from dataclasses import dataclass, field
from logging import logging
from datetime import timedelta
from typing import Any, ClassVar

from engine.core.models.conditions.condition import Condition
from engine.core.models.triggers.time_window import TimeWindow


@dataclass(slots=True, kw_only=True)
class MultipleCondition(Condition):
    """Run a flow when multiple preconditions are true within a window (deprecated)."""
    id: str
    time_window: TimeWindow
    conditions: dict[str, Condition]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    reset_on_success: bool = True
    window: timedelta | None = None
    window_advance: timedelta | None = None

    def logger(self) -> Logger:
        raise NotImplementedError  # TODO: translate from Java
