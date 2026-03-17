from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\flow\LoopUntil.java
# WARNING: Unresolved types: core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.models.hierarchies.abstract_graph import AbstractGraph
from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.flowable_task import FlowableTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.executions.next_task_run import NextTaskRun
from engine.core.models.property.property import Property
from engine.core.models.tasks.resolved_task import ResolvedTask
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class LoopUntil(Task):
    """Repeat tasks until a condition becomes true."""
    tasks: list[Task]
    condition: Property[str]
    i_n_i_t_i_a_l__l_o_o_p__v_a_l_u_e: int = 1
    fail_on_max_reached: Property[bool] = Property.ofValue(false)
    check_frequency: CheckFrequency = CheckFrequency.builder().build()
    errors: list[Task] | None = None
    _finally: list[Task] | None = None

    def get_finally(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def tasks_tree(self, execution: Execution, task_run: TaskRun, parent_values: list[str]) -> AbstractGraph:
        raise NotImplementedError  # TODO: translate from Java

    def all_child_tasks(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def child_tasks(self, run_context: RunContext, parent_task_run: TaskRun) -> list[ResolvedTask]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_nexts(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def next_execution_date(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def reached_maximums(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun, print_log: bool) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_state(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> Optional[State.Type]:
        raise NotImplementedError  # TODO: translate from Java

    def child_task_run_executed(self, execution: Execution, parent_task_run: TaskRun) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def outputs(self, run_context: RunContext) -> LoopUntil.Output:
        raise NotImplementedError  # TODO: translate from Java

    def outputs(self, parent_task_run: TaskRun) -> LoopUntil.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        iteration_count: int | None = None

    @dataclass(slots=True)
    class CheckFrequency:
        interval: Property[timedelta] = Property.ofValue(Duration.ofMinutes(1))
        max_iterations: Property[int] | None = None
        max_duration: Property[timedelta] | None = None
