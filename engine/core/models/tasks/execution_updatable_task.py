from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\ExecutionUpdatableTask.java
# WARNING: Unresolved types: Exception

from typing import Any, Protocol

from engine.core.models.executions.execution import Execution
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


class ExecutionUpdatableTask(Protocol):
    def update(self, execution: Execution, run_context: RunContext) -> Execution: ...

    def resolve_state(self, run_context: RunContext, execution: Execution) -> Optional[State.Type]: ...
