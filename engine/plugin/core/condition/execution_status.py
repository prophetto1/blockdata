from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\ExecutionStatus.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ExecutionStatus(Condition):
    """Match executions by status."""
    in: Property[list[State.Type]] | None = None
    not_in: Property[list[State.Type]] | None = None

    def test(self, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
