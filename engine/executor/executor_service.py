from __future__ import annotations

# Source: E:\KESTRA\executor\src\main\java\io\kestra\executor\ExecutorService.java
# WARNING: Unresolved types: ApplicationContext, Exception, Logger, OpenTelemetry, Supplier

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar, Optional

from engine.core.models.tasks.retrys.abstract_retry import AbstractRetry
from engine.core.assets.asset_service import AssetService
from engine.core.debug.breakpoint import Breakpoint
from engine.core.services.condition_service import ConditionService
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.core.models.executions.execution_killed_execution import ExecutionKilledExecution
from engine.core.runners.execution_running import ExecutionRunning
from engine.core.plugins.notifications.execution_service import ExecutionService
from engine.core.runners.executor import Executor
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.runners.flow_meta_store_interface import FlowMetaStoreInterface
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.executions.log_entry import LogEntry
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.models.executions.next_task_run import NextTaskRun
from engine.core.queues.queue_exception import QueueException
from engine.core.queues.queue_interface import QueueInterface
from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.runners.run_context_initializer import RunContextInitializer
from engine.executor.sla_service import SLAService
from engine.core.models.flows.state import State
from engine.core.runners.subflow_execution_end import SubflowExecutionEnd
from engine.core.runners.subflow_execution_result import SubflowExecutionResult
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type
from engine.core.services.variables_service import VariablesService
from engine.core.models.flows.sla.violation import Violation
from engine.core.runners.worker_group_executor_interface import WorkerGroupExecutorInterface
from engine.core.services.worker_group_service import WorkerGroupService
from engine.core.runners.worker_job import WorkerJob
from engine.executor.worker_job_running_state_store import WorkerJobRunningStateStore
from engine.core.runners.worker_task_result import WorkerTaskResult


@dataclass(slots=True, kw_only=True)
class ExecutorService:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    application_context: ApplicationContext | None = None
    run_context_factory: RunContextFactory | None = None
    metric_registry: MetricRegistry | None = None
    condition_service: ConditionService | None = None
    worker_group_executor_interface: WorkerGroupExecutorInterface | None = None
    worker_job_running_state_store: WorkerJobRunningStateStore | None = None
    flow_executor_interface: FlowMetaStoreInterface | None = None
    execution_service: ExecutionService | None = None
    worker_group_service: WorkerGroupService | None = None
    sla_service: SLAService | None = None
    open_telemetry: Optional[OpenTelemetry] | None = None
    variables_service: VariablesService | None = None
    kill_queue: QueueInterface[ExecutionKilled] | None = None
    log_queue: QueueInterface[LogEntry] | None = None
    asset_service: AssetService | None = None
    run_context_initializer: RunContextInitializer | None = None

    def flow_executor_interface(self) -> FlowMetaStoreInterface:
        raise NotImplementedError  # TODO: translate from Java

    def process_execution_running(self, flow: FlowInterface, running_count: int, execution_running: ExecutionRunning) -> ExecutionRunning:
        raise NotImplementedError  # TODO: translate from Java

    def process(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def on_nexts(self, execution: Execution, nexts: list[TaskRun]) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def child_worker_task_result(self, flow: FlowWithSource, execution: Execution, parent_task_run: TaskRun) -> Optional[WorkerTaskResult]:
        raise NotImplementedError  # TODO: translate from Java

    def child_worker_task_type_to_worker_task(self, find_state: Optional[State.Type], task_run: TaskRun) -> Optional[WorkerTaskResult]:
        raise NotImplementedError  # TODO: translate from Java

    def child_nexts_task_run(self, executor: Executor, parent_task_run: TaskRun) -> list[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def save_flowable_output(self, next_task_runs: list[NextTaskRun], executor: Executor) -> list[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def on_end(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_next(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_child_next(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_child_worker_task_result(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def search_for_parent_retry(self, task_run: TaskRun, executor: Executor) -> AbstractRetry:
        raise NotImplementedError  # TODO: translate from Java

    def handle_paused_delay(self, executor: Executor, worker_task_results: list[WorkerTaskResult]) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_created_killing(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_after_execution(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_end(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_restart(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_killing(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_worker_task(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def should_suspend(self, task_run: TaskRun, breakpoints: list[Breakpoint]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def handle_executable_task(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_execution_updating_task(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def add_worker_task_results(self, executor: Executor, worker_task_results: list[WorkerTaskResult]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def add_worker_task_result(self, executor: Executor, flow: Supplier[FlowWithSource], worker_task_result: WorkerTaskResult) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def add_dynamic_task_run(self, execution: Execution, flow: Supplier[FlowWithSource], worker_task_result: WorkerTaskResult) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def can_be_purged(self, executor: Executor) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, log: Logger, in: bool, value: WorkerJob) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, log: Logger, in: bool, value: WorkerTaskResult) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, log: Logger, in: bool, value: SubflowExecutionResult) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, log: Logger, in: bool, value: SubflowExecutionEnd) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, log: Logger, in: bool, value: Execution) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, log: Logger, in: bool, value: Executor) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, log: Logger, in: bool, value: ExecutionKilledExecution) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_execution_changed_sla(self, executor: Executor) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def process_violation(self, run_context: RunContext, executor: Executor, violation: Violation) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def mark_as(self, execution: Execution, state: State.Type) -> Execution:
        raise NotImplementedError  # TODO: translate from Java
