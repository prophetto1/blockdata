from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\flow\Pause.java
# WARNING: Unresolved types: core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.models.hierarchies.abstract_graph import AbstractGraph
from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.flowable_task import FlowableTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.flows.input import Input
from engine.core.models.executions.next_task_run import NextTaskRun
from engine.core.models.property.property import Property
from engine.core.models.tasks.resolved_task import ResolvedTask
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class Pause(Task):
    """Pause the flow until it is resumed."""
    behavior: Property[Behavior] = Property.ofValue(Behavior.RESUME)
    delay: Property[timedelta] | None = None
    pause_duration: Property[timedelta] | None = None
    on_pause: Task | None = None
    on_resume: list[Input[Any]] | None = None
    errors: list[Task] | None = None
    _finally: list[Task] | None = None
    tasks: list[Task] | None = None

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

    @staticmethod
    def find_terminal_state(parent_task_run: TaskRun) -> State.Type:
        raise NotImplementedError  # TODO: translate from Java

    def need_pause(self, parent_task_run: TaskRun) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_state(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> Optional[State.Type]:
        raise NotImplementedError  # TODO: translate from Java

    def generate_outputs(self, inputs: dict[str, Any], resumed: Resumed) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        on_resume: dict[str, Any] | None = None
        resumed: Resumed | None = None

    @dataclass(slots=True)
    class Resumed:
        by: str | None = None
        on: datetime | None = None
        to: State.Type | None = None

        @staticmethod
        def now() -> Resumed:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def now(to: State.Type) -> Resumed:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def now(by: str) -> Resumed:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def now(by: str, to: State.Type) -> Resumed:
            raise NotImplementedError  # TODO: translate from Java

    class Behavior(str, Enum):
        RESUME = "RESUME"
        WARN = "WARN"
        CANCEL = "CANCEL"
        FAIL = "FAIL"
