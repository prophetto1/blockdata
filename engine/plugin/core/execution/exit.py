from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\execution\Exit.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from enum import Enum
from logging import logging
from typing import Any, ClassVar, Optional

from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.execution_updatable_task import ExecutionUpdatableTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.models.tasks.task import Task
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class Exit(Task):
    """Terminate the current execution with a chosen state."""
    state: Property[ExitState]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def update(self, execution: Execution, run_context: RunContext) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_state(self, run_context: RunContext, execution: Execution) -> Optional[State.Type]:
        raise NotImplementedError  # TODO: translate from Java

    def execution_state(self, run_context: RunContext) -> State.Type:
        raise NotImplementedError  # TODO: translate from Java

    class ExitState(str, Enum):
        SUCCESS = "SUCCESS"
        WARNING = "WARNING"
        KILLED = "KILLED"
        FAILED = "FAILED"
        CANCELED = "CANCELED"
        CANCELLED = "CANCELLED"
