from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\Execution.java

from dataclasses import dataclass, field, replace
from logging import Logger, getLogger
from datetime import datetime
from typing import Any, Callable, ClassVar, Optional

from engine.core.debug.breakpoint import Breakpoint
from engine.core.models.executions.execution_kind import ExecutionKind
from engine.core.models.executions.execution_metadata import ExecutionMetadata
from engine.core.models.executions.execution_trigger import ExecutionTrigger
from engine.core.models.flows.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.has_uid import HasUID
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.label import Label
from engine.core.serializers.list_or_map_of_label_deserializer import ListOrMapOfLabelDeserializer
from engine.core.serializers.list_or_map_of_label_serializer import ListOrMapOfLabelSerializer
from engine.core.models.executions.log_entry import LogEntry
from engine.core.models.tasks.resolved_task import ResolvedTask
from engine.core.models.soft_deletable import SoftDeletable
from engine.core.models.flows.state import State
from engine.core.test.flow.task_fixture import TaskFixture
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.executions.task_run_attempt import TaskRunAttempt
from engine.core.models.tenant_interface import TenantInterface
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class Execution:
    id: str
    namespace: str
    flow_id: str
    flow_revision: int
    state: State
    logger: ClassVar[Logger] = getLogger(__name__)
    deleted: bool = False
    tenant_id: str | None = None
    task_run_list: list[TaskRun] | None = None
    inputs: dict[str, Any] | None = None
    outputs: dict[str, Any] | None = None
    labels: list[Label] | None = None
    variables: dict[str, Any] | None = None
    parent_id: str | None = None
    original_id: str | None = None
    trigger: ExecutionTrigger | None = None
    metadata: ExecutionMetadata | None = None
    schedule_date: datetime | None = None
    trace_parent: str | None = None
    fixtures: list[TaskFixture] | None = None
    kind: ExecutionKind | None = None
    breakpoints: list[Breakpoint] | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def new_execution(flow: FlowInterface, inputs: Callable[FlowInterface, Execution, dict[str, Any]], labels: list[Label] | None = None, schedule_date: Optional[datetime] | None = None, kind: ExecutionKind | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def builder() -> ExecutionBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def with_state(self, state: State.Type) -> Execution:
        return replace(self, state=state)

    def with_labels(self, labels: list[Label]) -> Execution:
        return replace(self, labels=labels)

    def with_task_run(self, task_run: TaskRun) -> Execution:
        return replace(self, task_run=task_run)

    def with_breakpoints(self, new_breakpoints: list[Breakpoint]) -> Execution:
        return replace(self, breakpoints=new_breakpoints)

    def add_label(self, label: Label) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def child_execution(self, child_execution_id: str, task_run_list: list[TaskRun], state: State) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def find_task_runs_by_task_id(self, id: str) -> list[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def find_task_run_by_task_run_id(self, id: str) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    def find_task_run_by_task_id_and_value(self, id: str, values: list[str]) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    def find_task_depending_flow_state(self, resolved_tasks: list[ResolvedTask], resolved_errors: list[ResolvedTask], resolved_finally: list[ResolvedTask], parent_task_run: TaskRun | None = None, terminal_state: State.Type | None = None) -> list[ResolvedTask]:
        raise NotImplementedError  # TODO: translate from Java

    def remove_disabled(self, tasks: list[ResolvedTask]) -> list[ResolvedTask]:
        raise NotImplementedError  # TODO: translate from Java

    def find_task_run_by_tasks(self, resolved_tasks: list[ResolvedTask], parent_task_run: TaskRun) -> list[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def find_first_by_state(self, state: State.Type) -> Optional[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def find_first_running(self) -> Optional[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def find_last_not_terminated(self) -> Optional[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def find_last_by_state(self, task_runs: list[TaskRun], state: State.Type) -> Optional[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def find_last_created(self, task_runs: list[TaskRun]) -> Optional[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def find_last_submitted(self, task_runs: list[TaskRun]) -> Optional[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def find_last_running(self, task_runs: list[TaskRun]) -> Optional[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def find_last_terminated(self, task_runs: list[TaskRun]) -> Optional[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated(self, resolved_tasks: list[ResolvedTask], parent_task_run: TaskRun | None = None) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def has_warning(self, resolved_tasks: list[ResolvedTask] | None = None, parent_task_run: TaskRun | None = None) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def has_failed(self, resolved_tasks: list[ResolvedTask] | None = None, parent_task_run: TaskRun | None = None) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def has_failed_no_retry(self, resolved_tasks: list[ResolvedTask], parent_task_run: TaskRun) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def should_not_be_retried(resolved_tasks: list[ResolvedTask], parent_task_run: TaskRun, task_run: TaskRun) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def has_created(self, resolved_tasks: list[ResolvedTask] | None = None, parent_task_run: TaskRun | None = None) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def has_running(self, resolved_tasks: list[ResolvedTask], parent_task_run: TaskRun | None = None) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def guess_final_state(self, current_tasks: list[ResolvedTask], parent_task_run: TaskRun | None = None, allow_failure: bool | None = None, allow_warning: bool | None = None, terminal_state: State.Type | None = None) -> State.Type:
        raise NotImplementedError  # TODO: translate from Java

    def has_task_run_joinable(self, task_run: TaskRun) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def failed_execution_from_executor(self, e: Exception) -> FailedExecutionWithLog:
        raise NotImplementedError  # TODO: translate from Java

    def get_fixture_for_task_run(self, task_run: TaskRun) -> Optional[TaskFixture]:
        raise NotImplementedError  # TODO: translate from Java

    def new_attempts_task_run_for_failed_execution(self, task_run: TaskRun, e: Exception) -> FailedTaskRunWithLog:
        raise NotImplementedError  # TODO: translate from Java

    def last_attempts_task_run_for_failed_execution(self, task_run: TaskRun, last_attempt: TaskRunAttempt, e: Exception) -> FailedTaskRunWithLog:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def logging_event_from_exception(e: BaseException) -> ILoggingEvent:
        raise NotImplementedError  # TODO: translate from Java

    def outputs(self, task_run: TaskRun | None = None, by_ids: dict[str, TaskRun] | None = None) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def parents(self, task_run: TaskRun) -> list[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def find_parents(self, task_run: TaskRun, task_run_by_id: dict[str, TaskRun] | None = None) -> list[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def find_children(self, parent_task_run: TaskRun) -> list[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def find_parents_values(self, task_run: TaskRun, with_current: bool) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self, pretty: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_string_state(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_crc32_state(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ExecutionBuilder:

        def labels(self, labels: list[Label]) -> ExecutionBuilder:
            raise NotImplementedError  # TODO: translate from Java

        def prebuild(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CustomExecutionBuilder(ExecutionBuilder):

        def build(self) -> Execution:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class FailedTaskRunWithLog:
        task_run: TaskRun | None = None
        logs: list[LogEntry] | None = None

    @dataclass(slots=True)
    class FailedExecutionWithLog:
        execution: Execution | None = None
        logs: list[LogEntry] | None = None
