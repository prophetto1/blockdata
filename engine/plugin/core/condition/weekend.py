from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\Weekend.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition import Condition
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.property.property import Property
from engine.core.models.conditions.schedule_condition import ScheduleCondition


@dataclass(slots=True, kw_only=True)
class Weekend(Condition):
    """Allow events on weekends."""
    date: Property[str] = Property.ofExpression("{{ trigger.date }}")

    def test(self, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
