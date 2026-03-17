from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\Expression.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition import Condition
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class Expression(Condition):
    """Condition based on variable expression."""
    expression: Property[str]

    def test(self, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
