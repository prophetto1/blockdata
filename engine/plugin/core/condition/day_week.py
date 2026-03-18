from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\DayWeek.java
# WARNING: Unresolved types: DayOfWeek

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.conditions.schedule_condition import ScheduleCondition


@dataclass(slots=True, kw_only=True)
class DayWeek(Condition):
    """Allow events on a specific weekday."""
    date: Property[str]
    day_of_week: Property[DayOfWeek]

    def test(self, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
