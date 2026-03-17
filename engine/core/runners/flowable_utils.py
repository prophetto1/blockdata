from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\FlowableUtils.java
# WARNING: Unresolved types: BiFunction, DagTask, ObjectMapper, Stream, TypeReference

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.flow.dag import Dag
from engine.core.models.executions.execution import Execution
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.executions.next_task_run import NextTaskRun
from engine.core.models.tasks.resolved_task import ResolvedTask
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class FlowableUtils:
    t_y_p_e__r_e_f_e_r_e_n_c_e: TypeReference[list[Any]] = new TypeReference<>() {}
    m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofJson()

    @staticmethod
    def resolve_sequential_nexts(execution: Execution, tasks: list[ResolvedTask]) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_sequential_nexts(execution: Execution, tasks: list[ResolvedTask], errors: list[ResolvedTask], _finally: list[ResolvedTask]) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_sequential_nexts(execution: Execution, tasks: list[ResolvedTask], errors: list[ResolvedTask], _finally: list[ResolvedTask], parent_task_run: TaskRun) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_sequential_nexts(execution: Execution, tasks: list[ResolvedTask], errors: list[ResolvedTask], _finally: list[ResolvedTask], parent_task_run: TaskRun, terminal_state: State.Type) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def inner_resolve_sequential_nexts(execution: Execution, current_tasks: list[ResolvedTask], parent_task_run: TaskRun) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_wait_for_next(execution: Execution, tasks: list[ResolvedTask], errors: list[ResolvedTask], _finally: list[ResolvedTask], parent_task_run: TaskRun) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_sequential_state(execution: Execution, tasks: list[ResolvedTask], errors: list[ResolvedTask], _finally: list[ResolvedTask], parent_task_run: TaskRun, run_context: RunContext, allow_failure: bool, allow_warning: bool) -> Optional[State.Type]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_state(execution: Execution, tasks: list[ResolvedTask], errors: list[ResolvedTask], _finally: list[ResolvedTask], parent_task_run: TaskRun, run_context: RunContext, allow_failure: bool, allow_warning: bool) -> Optional[State.Type]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_state(execution: Execution, tasks: list[ResolvedTask], errors: list[ResolvedTask], _finally: list[ResolvedTask], parent_task_run: TaskRun, run_context: RunContext, allow_failure: bool, allow_warning: bool, terminal_state: State.Type) -> Optional[State.Type]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_tasks(tasks: list[Task], parent_task_run: TaskRun) -> list[ResolvedTask]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_parallel_nexts(execution: Execution, tasks: list[ResolvedTask], errors: list[ResolvedTask], _finally: list[ResolvedTask], parent_task_run: TaskRun, concurrency: int) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_concurrent_nexts(execution: Execution, tasks: list[ResolvedTask], errors: list[ResolvedTask], _finally: list[ResolvedTask], parent_task_run: TaskRun, concurrency: int) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_dag_nexts(execution: Execution, tasks: list[ResolvedTask], errors: list[ResolvedTask], _finally: list[ResolvedTask], parent_task_run: TaskRun, concurrency: int, task_dependencies: list[Dag.DagTask]) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_parallel_nexts(execution: Execution, tasks: list[ResolvedTask], errors: list[ResolvedTask], _finally: list[ResolvedTask], parent_task_run: TaskRun, concurrency: int, next_task_run_function: BiFunction[Stream[NextTaskRun], list[TaskRun], Stream[NextTaskRun]]) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_each_tasks(run_context: RunContext, parent_task_run: TaskRun, tasks: list[Task], value: Any) -> list[ResolvedTask]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_task_run_for(resolved_task: ResolvedTask, task_run: TaskRun, parent_task_run: TaskRun) -> bool:
        raise NotImplementedError  # TODO: translate from Java
