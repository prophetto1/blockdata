from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\ExecutionOutputs.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.conditions.condition import Condition
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class ExecutionOutputs(Condition):
    """Condition based on the outputs of an upstream execution."""
    expression: Property[bool]
    trigger_var: ClassVar[str] = "trigger"
    outputs_var: ClassVar[str] = "outputs"

    def test(self, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def has_no_outputs(self, execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java
