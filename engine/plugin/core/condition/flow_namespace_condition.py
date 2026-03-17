from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\FlowNamespaceCondition.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException


@dataclass(slots=True, kw_only=True)
class FlowNamespaceCondition(Condition):
    """Match a flow namespace (deprecated)."""
    namespace: str
    prefix: bool = False

    def test(self, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
