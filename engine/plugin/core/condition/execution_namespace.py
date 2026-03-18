from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\ExecutionNamespace.java

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException


@dataclass(slots=True, kw_only=True)
class ExecutionNamespace(Condition):
    """Match executions by namespace."""
    namespace: Property[str]
    prefix: Property[bool]
    comparison: Property[Comparison] | None = None

    def test(self, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    class Comparison(str, Enum):
        EQUALS = "EQUALS"
        PREFIX = "PREFIX"
        SUFFIX = "SUFFIX"
