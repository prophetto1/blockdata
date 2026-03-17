from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\DayWeekInMonth.java
# WARNING: Unresolved types: DayOfWeek

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition import Condition
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.property.property import Property
from engine.core.models.conditions.schedule_condition import ScheduleCondition


@dataclass(slots=True, kw_only=True)
class DayWeekInMonth(Condition):
    """Allow events on an nth weekday within the month."""
    day_of_week: Property[DayOfWeek]
    day_in_month: Property[DayWeekInMonth.DayInMonth]
    date: str = "{{ trigger.date }}"

    def test(self, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    class DayInMonth(str, Enum):
        FIRST = "FIRST"
        LAST = "LAST"
        SECOND = "SECOND"
        THIRD = "THIRD"
        FOURTH = "FOURTH"
