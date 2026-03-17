from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\FlowableTask.java
# WARNING: Unresolved types: Exception, T

from typing import Any, Optional, Protocol

from engine.core.models.hierarchies.abstract_graph import AbstractGraph
from engine.core.models.executions.execution import Execution
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.executions.next_task_run import NextTaskRun
from engine.core.models.flows.output import Output
from engine.core.models.tasks.resolved_task import ResolvedTask
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type


class FlowableTask(Protocol):
    def get_errors(self) -> list[Task]: ...

    def get_finally(self) -> list[Task]: ...

    def tasks_tree(self, execution: Execution, task_run: TaskRun, parent_values: list[str]) -> AbstractGraph: ...

    def all_child_tasks(self) -> list[Task]: ...

    def child_tasks(self, run_context: RunContext, parent_task_run: TaskRun) -> list[ResolvedTask]: ...

    def resolve_nexts(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> list[NextTaskRun]: ...

    def is_allow_failure(self) -> bool: ...

    def is_allow_warning(self) -> bool: ...

    def resolve_state(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> Optional[State.Type]: ...

    def outputs(self, run_context: RunContext) -> T: ...
