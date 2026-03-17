from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcExecutor.java
# WARNING: Unresolved types: ApplicationEventPublisher, AtomicBoolean, AtomicReference, Configuration, Exception, FailedExecutionWithLog, ObjectMapper, Runnable, ScheduledExecutorService, ScheduledFuture, ServiceState, TemplateExecutorInterface, concurrent, java, util

from dataclasses import dataclass, field
from typing import Any

from engine.jdbc.runner.abstract_jdbc_concurrency_limit_storage import AbstractJdbcConcurrencyLimitStorage
from engine.jdbc.runner.abstract_jdbc_execution_delay_storage import AbstractJdbcExecutionDelayStorage
from engine.jdbc.runner.abstract_jdbc_execution_queued_storage import AbstractJdbcExecutionQueuedStorage
from engine.jdbc.repository.abstract_jdbc_execution_repository import AbstractJdbcExecutionRepository
from engine.jdbc.runner.abstract_jdbc_executor_state_storage import AbstractJdbcExecutorStateStorage
from engine.jdbc.repository.abstract_jdbc_flow_topology_repository import AbstractJdbcFlowTopologyRepository
from engine.jdbc.repository.abstract_jdbc_worker_job_running_repository import AbstractJdbcWorkerJobRunningRepository
from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.core.killswitch.evaluation_type import EvaluationType
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.core.plugins.notifications.execution_service import ExecutionService
from engine.core.runners.executor import Executor
from engine.core.runners.executor_interface import ExecutorInterface
from engine.executor.executor_service import ExecutorService
from engine.core.runners.executor_state import ExecutorState
from engine.core.utils.executors_utils import ExecutorsUtils
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.services.flow_listeners_interface import FlowListenersInterface
from engine.core.runners.flow_meta_store_interface import FlowMetaStoreInterface
from engine.core.exceptions.flow_not_found_exception import FlowNotFoundException
from engine.core.topologies.flow_topology_service import FlowTopologyService
from engine.executor.flow_trigger_service import FlowTriggerService
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.jdbc.runner.jdbc_service_liveness_coordinator import JdbcServiceLivenessCoordinator
from engine.core.killswitch.kill_switch_service import KillSwitchService
from engine.core.models.executions.log_entry import LogEntry
from engine.core.services.maintenance_service import MaintenanceService
from engine.core.server.metric import Metric
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.runners.multiple_condition_event import MultipleConditionEvent
from engine.core.models.triggers.multipleflows.multiple_condition_storage_interface import MultipleConditionStorageInterface
from engine.core.services.plugin_default_service import PluginDefaultService
from engine.core.queues.queue_exception import QueueException
from engine.core.queues.queue_interface import QueueInterface
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.models.flows.sla.s_l_a_monitor_storage import SLAMonitorStorage
from engine.executor.s_l_a_service import SLAService
from engine.core.runners.scheduler_trigger_state_interface import SchedulerTriggerStateInterface
from engine.core.server.service_state_change_event import ServiceStateChangeEvent
from engine.core.server.service_type import ServiceType
from engine.core.models.flows.state import State
from engine.core.runners.subflow_execution_end import SubflowExecutionEnd
from engine.core.runners.subflow_execution_result import SubflowExecutionResult
from engine.core.models.executions.task_run import TaskRun
from engine.plugin.core.flow.template import Template
from engine.core.trace.tracer import Tracer
from engine.core.trace.tracer_factory import TracerFactory
from engine.core.repositories.trigger_repository_interface import TriggerRepositoryInterface
from engine.core.models.flows.type import Type
from engine.core.services.variables_service import VariablesService
from engine.core.services.worker_group_service import WorkerGroupService
from engine.core.runners.worker_job import WorkerJob
from engine.core.runners.worker_task_result import WorkerTaskResult


@dataclass(slots=True, kw_only=True)
class JdbcExecutor:
    m_a_p_p_e_r: ObjectMapper = JdbcMapper.of()
    i_g_n_o_r_i_n_g__e_x_e_c_u_t_i_o_n__m_s_g: str = "Ignoring execution {} because there is a kill switch on it"
    c_a_n_c_e_l_l_i_n_g__e_x_e_c_u_t_i_o_n__m_s_g: str = "Cancelling execution {} because there is a kill switch on it"
    k_i_l_l_i_n_g__e_x_e_c_u_t_i_o_n__m_s_g: str = "Killing execution {} because there is a kill switch on it"
    scheduled_delay: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
    id: str = IdUtils.create()
    shutdown: AtomicBoolean = new AtomicBoolean(false)
    is_paused: AtomicBoolean = new AtomicBoolean(false)
    state: AtomicReference[ServiceState] = new AtomicReference<>()
    receive_cancellations: list[Runnable] = field(default_factory=list)
    execution_delay_future: ScheduledFuture[Any] | None = None
    monitor_s_l_a_future: ScheduledFuture[Any] | None = None
    execution_repository: AbstractJdbcExecutionRepository | None = None
    execution_queue: QueueInterface[Execution] | None = None
    worker_job_queue: QueueInterface[WorkerJob] | None = None
    worker_task_result_queue: QueueInterface[WorkerTaskResult] | None = None
    log_queue: QueueInterface[LogEntry] | None = None
    flow_queue: QueueInterface[FlowInterface] | None = None
    kill_queue: QueueInterface[ExecutionKilled] | None = None
    subflow_execution_result_queue: QueueInterface[SubflowExecutionResult] | None = None
    subflow_execution_end_queue: QueueInterface[SubflowExecutionEnd] | None = None
    multiple_condition_event_queue: QueueInterface[MultipleConditionEvent] | None = None
    run_context_factory: RunContextFactory | None = None
    plugin_default_service: PluginDefaultService | None = None
    template_executor_interface: Optional[Template.TemplateExecutorInterface] | None = None
    executor_service: ExecutorService | None = None
    multiple_condition_storage: MultipleConditionStorageInterface | None = None
    flow_trigger_service: FlowTriggerService | None = None
    metric_registry: MetricRegistry | None = None
    flow_listeners: FlowListenersInterface | None = None
    execution_service: ExecutionService | None = None
    execution_delay_storage: AbstractJdbcExecutionDelayStorage | None = None
    execution_queued_storage: AbstractJdbcExecutionQueuedStorage | None = None
    concurrency_limit_storage: AbstractJdbcConcurrencyLimitStorage | None = None
    executor_state_storage: AbstractJdbcExecutorStateStorage | None = None
    flow_topology_service: FlowTopologyService | None = None
    all_flows: list[FlowWithSource] | None = None
    worker_group_service: WorkerGroupService | None = None
    kill_switch_service: KillSwitchService | None = None
    worker_job_running_repository: AbstractJdbcWorkerJobRunningRepository | None = None
    sla_monitor_storage: SLAMonitorStorage | None = None
    sla_service: SLAService | None = None
    trigger_repository: TriggerRepositoryInterface | None = None
    trigger_state: SchedulerTriggerStateInterface | None = None
    variables_service: VariablesService | None = None
    clean_execution_queue: bool | None = None
    clean_worker_job_queue: bool | None = None
    tracer: Tracer | None = None
    flow_meta_store: FlowMetaStoreInterface | None = None
    service_liveness_coordinator: JdbcServiceLivenessCoordinator | None = None
    event_publisher: ApplicationEventPublisher[ServiceStateChangeEvent] | None = None
    flow_topology_repository: AbstractJdbcFlowTopologyRepository | None = None
    maintenance_service: MaintenanceService | None = None
    worker_task_result_executor_service: java.util.concurrent.ExecutorService | None = None
    execution_executor_service: java.util.concurrent.ExecutorService | None = None
    number_of_threads: int | None = None

    def init_metrics(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_metrics(self) -> set[Metric]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def multiple_condition_event_queue(self, either: Either[MultipleConditionEvent, DeserializationException]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def enter_maintenance(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def exit_maintenance(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def re_emit_worker_jobs_for_workers(self, configuration: Configuration, ids: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def execution_queue(self, either: Either[Execution, DeserializationException]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fail(self, message: Execution, e: Exception) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def worker_task_result_queue(self, either: Either[WorkerTaskResult, DeserializationException]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def subflow_execution_result_queue(self, either: Either[SubflowExecutionResult, DeserializationException]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def subflow_execution_end_queue(self, either: Either[SubflowExecutionEnd, DeserializationException]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill_queue(self, either: Either[ExecutionKilled, DeserializationException]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def killing_or_after_kill_state(self, execution_id: str, after_kill_state: Optional[State.Type]) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def to_execution(self, executor: Executor) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def to_execution(self, executor: Executor, ignore_failure: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def process_flow_triggers(self, execution: Execution) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find_flow_or_throw(self, execution: Execution) -> FlowWithSource:
        raise NotImplementedError  # TODO: translate from Java

    def find_flow(self, execution: Execution) -> Optional[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def execution_delay_send(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def execution_s_l_a_monitor(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def deduplicate_nexts(self, execution: Execution, executor_state: ExecutorState, task_runs: list[TaskRun]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def deduplicate_worker_task(self, execution: Execution, executor_state: ExecutorState, task_run: TaskRun) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def deduplicate_subflow_execution(self, execution: Execution, executor_state: ExecutorState, task_run: TaskRun) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def deduplication_key(self, task_run: TaskRun) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def fail_execution_from_executor(self, executor: Executor, e: Exception) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_failed_execution_from_executor(self, executor: Executor, e: Exception) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_failed_execution_from_executor(self, executor: Executor, failed_execution_with_log: FailedExecutionWithLog) -> Executor:
        raise NotImplementedError  # TODO: translate from Java

    def handle_kill_switched_execution(self, evaluation_type: EvaluationType, message: Execution) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_kill_switched_worker_task_result(self, evaluation_type: EvaluationType, message: WorkerTaskResult) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_kill_switched_execution(self, evaluation_type: EvaluationType, tenant_id: str, execution_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill_execution(self, tenant_id: str, execution_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def cancel_execution(self, tenant_id: str, execution_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self) -> ServiceType:
        raise NotImplementedError  # TODO: translate from Java

    def get_state(self) -> ServiceState:
        raise NotImplementedError  # TODO: translate from Java
