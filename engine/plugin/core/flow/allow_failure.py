from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\flow\AllowFailure.java

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.flowable_task import FlowableTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from engine.plugin.core.flow.sequential import Sequential
from engine.core.models.flows.state import State
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class AllowFailure(Sequential):
    """Let a block fail without stopping the rest of the flow."""

    def resolve_state(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> Optional[State.Type]:
        raise NotImplementedError  # TODO: translate from Java
