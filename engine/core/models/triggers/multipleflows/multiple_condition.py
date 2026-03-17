from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\multipleflows\MultipleCondition.java
# WARNING: Unresolved types: Logger, PredicateChecked

from typing import Any, Protocol

from engine.core.models.conditions.condition import Condition
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException
from engine.core.utils.rethrow import Rethrow
from engine.core.models.triggers.time_window import TimeWindow


class MultipleCondition(Protocol):
    def get_id(self) -> str: ...

    def get_time_window(self) -> TimeWindow: ...

    def get_reset_on_success(self) -> bool: ...

    def get_conditions(self) -> dict[str, Condition]: ...

    def logger(self) -> Logger: ...

    def test(self, condition_context: ConditionContext) -> bool: ...
