from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\Not.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.conditions.schedule_condition import ScheduleCondition


@dataclass(slots=True, kw_only=True)
class Not(Condition):
    """Invert one or more conditions."""
    conditions: list[Condition]

    def test(self, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
