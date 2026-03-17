from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\ExecutionService.java
# WARNING: Unresolved types: CompletedPart, Publisher, Resumed

from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import datetime
from typing import Any, Callable, ClassVar, Optional

from engine.core.models.tasks.retrys.abstract_retry import AbstractRetry
from engine.core.services.concurrency_limit_service import ConcurrencyLimitService
from engine.core.services.condition_service import ConditionService
from engine.core.events.crud_event import CrudEvent
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_killed_execution import ExecutionKilledExecution
from engine.core.repositories.execution_repository_interface import ExecutionRepositoryInterface
from engine.core.models.flows.flow import Flow
from engine.core.runners.flow_input_output import FlowInputOutput
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.flows.input.input_and_value import InputAndValue
from engine.core.exceptions.internal_exception import InternalException
from engine.core.repositories.log_repository_interface import LogRepositoryInterface
from engine.core.repositories.metric_repository_interface import MetricRepositoryInterface
from engine.plugin.core.flow.pause import Pause
from engine.core.services.plugin_default_service import PluginDefaultService
from engine.core.models.tasks.resolved_task import ResolvedTask
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.models.flows.state import State
from engine.core.storages.storage_interface import StorageInterface
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.triggers.trigger import Trigger
from engine.core.models.flows.type import Type
from engine.core.services.variables_service import VariablesService


@dataclass(slots=True, kw_only=True)
class ExecutionService:
    logger: ClassVar[Logger] = getLogger(__name__)
    flow_repository_interface: FlowRepositoryInterface | None = None
    storage_interface: StorageInterface | None = None
    execution_repository: ExecutionRepositoryInterface | None = None
    log_repository: LogRepositoryInterface | None = None
    metric_repository: MetricRepositoryInterface | None = None
    flow_input_output: FlowInputOutput | None = None
    event_publisher: ApplicationEventPublisher[CrudEvent[Execution]] | None = None
    concurrency_limit_service: ConcurrencyLimitService | None = None
    condition_service: ConditionService | None = None
    run_context_factory: RunContextFactory | None = None
    plugin_default_service: PluginDefaultService | None = None
    variables_service: VariablesService | None = None

    def get_execution_if_pause(self, tenant: str, execution_id: str, with_acl: bool) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def get_execution(self, tenant: str, execution_id: str, with_acl: bool) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def retry_task(self, execution: Execution, flow: Flow, task_run_id: str) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def retry_wait_for(self, execution: Execution, flowable_task_run_id: str) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def pause_flowable(self, execution: Execution, update_flowable_task_run: TaskRun) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def restart(self, execution: Execution, revision: int) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def task_run_to_restart(self, execution: Execution, predicate: Callable[TaskRun]) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    def replay(self, execution: Execution, task_run_id: str, revision: int) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def change_task_run_state(self, execution: Execution, flow: Flow, task_run_id: str, new_state: State.Type) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def mark_as(self, execution: Execution, flow: FlowInterface, task_run_id: str, new_state: State.Type, on_resume_inputs: dict[str, Any] | None = None, resumed: Pause.Resumed | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def mark_with_task_run_as(self, execution: Execution, task_run_id: str, new_state: State.Type, mark_parents: bool) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def purge(self, purge_execution: bool, purge_log: bool, purge_metric: bool, purge_storage: bool, tenant_id: str, namespace: str, flow_id: str, start_date: datetime, end_date: datetime, state: list[State.Type], batch_size: int) -> PurgeResult:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, execution: Execution, delete_logs: bool, delete_metrics: bool, delete_storage: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def resume(self, execution: Execution, flow: FlowInterface, new_state: State.Type, inputs: Publisher[CompletedPart], resumed: Pause.Resumed | None = None) -> Mono[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_for_resume(self, execution: Execution, flow: Flow, inputs: Publisher[CompletedPart] | None = None) -> Mono[list[InputAndValue]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_first_paused_task_or(self, execution: Execution, flow: FlowInterface) -> Mono[Optional[Task]]:
        raise NotImplementedError  # TODO: translate from Java

    def pause(self, execution: Execution) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def kill_subflow_executions(self, tenant_id: str, execution_id: str) -> Flux[ExecutionKilledExecution]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self, execution: Execution, flow: FlowInterface, after_kill_state: Optional[State.Type] | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def kill_parent_taskruns(self, task_run: TaskRun, execution: Execution) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def remove_worker_task(self, flow: Flow, execution: Execution, task_run_to_restart: set[str], mapping_task_run_id: dict[str, str]) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_ancestors(self, execution: Execution, task_run: TaskRun) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    def map_task_run_id(self, execution: Execution, keep: bool) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def map_task_run(self, flow: Flow, original_task_run: TaskRun, mapping_task_run_id: dict[str, str], new_execution_id: str, new_state_type: State.Type, to_restart: bool) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    def task_run_with_ancestors(self, execution: Execution, task_runs: list[TaskRun]) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    def next_retry_date(self, retry: AbstractRetry, execution: Execution) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def force_run(self, execution: Execution) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def is_terminated(self, flow: Flow, execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_after_execution_tasks(self, flow: Flow) -> list[ResolvedTask]:
        raise NotImplementedError  # TODO: translate from Java

    def reset_execution(self, flow: FlowWithSource, execution: Execution, trigger: Trigger) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PurgeResult:
        executions_count: int = 0
        logs_count: int = 0
        storages_count: int = 0
        metrics_count: int = 0
