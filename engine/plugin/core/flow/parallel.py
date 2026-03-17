from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\flow\Parallel.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.flowable_task import FlowableTask
from engine.core.models.hierarchies.graph_cluster import GraphCluster
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.executions.next_task_run import NextTaskRun
from engine.core.models.property.property import Property
from engine.core.models.tasks.resolved_task import ResolvedTask
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Parallel(Task):
    """Run child tasks in parallel."""
    tasks: list[@NotNull Task]
    concurrent: Property[int] = Property.ofValue(0)
    errors: list[Task] | None = None
    _finally: list[Task] | None = None

    def get_finally(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def tasks_tree(self, execution: Execution, task_run: TaskRun, parent_values: list[str]) -> GraphCluster:
        raise NotImplementedError  # TODO: translate from Java

    def all_child_tasks(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def child_tasks(self, run_context: RunContext, parent_task_run: TaskRun) -> list[ResolvedTask]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_nexts(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_state(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> Optional[State.Type]:
        raise NotImplementedError  # TODO: translate from Java
