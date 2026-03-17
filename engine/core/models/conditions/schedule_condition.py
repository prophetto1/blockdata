from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\conditions\ScheduleCondition.java

from typing import Any, Protocol

from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException


class ScheduleCondition(Protocol):
    def test(self, condition_context: ConditionContext) -> bool: ...
