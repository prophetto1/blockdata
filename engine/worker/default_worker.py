from __future__ import annotations

# Source: E:\KESTRA\worker\src\main\java\io\kestra\worker\DefaultWorker.java
# WARNING: Unresolved types: ApplicationEventPublisher, AtomicBoolean, AtomicInteger, AtomicReference, ConcurrentHashMap, ObjectMapper, Runnable, ServiceState, Throwable, core, flows, io, kestra, models

from dataclasses import dataclass, field
from logging import logging
from datetime import timedelta
from typing import Any, ClassVar, Optional

from engine.worker.abstract_worker_callable import AbstractWorkerCallable
from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.executor.executor_service import ExecutorService
from engine.core.utils.executors_utils import ExecutorsUtils
from engine.core.models.executions.log_entry import LogEntry
from engine.core.services.maintenance_service import MaintenanceService
from engine.core.server.metric import Metric
from engine.core.models.executions.metric_entry import MetricEntry
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.queues.queue_exception import QueueException
from engine.core.queues.queue_interface import QueueInterface
from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_initializer import RunContextInitializer
from engine.core.runners.run_context_logger_factory import RunContextLoggerFactory
from engine.core.server.server_config import ServerConfig
from engine.core.server.service_state_change_event import ServiceStateChangeEvent
from engine.core.server.service_type import ServiceType
from engine.core.models.flows.state import State
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.executions.task_run_attempt import TaskRunAttempt
from engine.core.trace.tracer import Tracer
from engine.core.trace.tracer_factory import TracerFactory
from engine.core.models.triggers.trigger import Trigger
from engine.core.models.flows.type import Type
from engine.core.services.variables_service import VariablesService
from engine.core.runners.worker import Worker
from engine.core.services.worker_group_service import WorkerGroupService
from engine.core.runners.worker_job import WorkerJob
from engine.core.queues.worker_job_queue_interface import WorkerJobQueueInterface
from engine.worker.worker_security_service import WorkerSecurityService
from engine.core.runners.worker_task import WorkerTask
from engine.core.runners.worker_task_result import WorkerTaskResult
from engine.core.runners.worker_trigger import WorkerTrigger
from engine.core.runners.worker_trigger_result import WorkerTriggerResult


@dataclass(slots=True, kw_only=True)
class DefaultWorker:
    mapper: ClassVar[ObjectMapper]
    killed_execution: set[str]
    metric_running_count: dict[int, AtomicInteger]
    evaluate_trigger_running_count: dict[str, AtomicInteger]
    skip_graceful_termination: AtomicBoolean
    shutdown: AtomicBoolean
    init: AtomicBoolean
    state: AtomicReference[ServiceState]
    pending_job_count: AtomicInteger
    running_job_count: AtomicInteger
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    service_props_worker_group: ClassVar[str] = "worker.group"
    worker_callable_references: list[AbstractWorkerCallable] = field(default_factory=list)
    receive_cancellations: list[Runnable] = field(default_factory=list)
    worker_job_queue: WorkerJobQueueInterface | None = None
    worker_task_result_queue: QueueInterface[WorkerTaskResult] | None = None
    worker_trigger_result_queue: QueueInterface[WorkerTriggerResult] | None = None
    execution_killed_queue: QueueInterface[ExecutionKilled] | None = None
    metric_entry_queue: QueueInterface[MetricEntry] | None = None
    trigger_queue: QueueInterface[Trigger] | None = None
    log_queue: QueueInterface[LogEntry] | None = None
    metric_registry: MetricRegistry | None = None
    server_config: ServerConfig | None = None
    run_context_initializer: RunContextInitializer | None = None
    run_context_logger_factory: RunContextLoggerFactory | None = None
    worker_security_service: WorkerSecurityService | None = None
    variables_service: VariablesService | None = None
    event_publisher: ApplicationEventPublisher[ServiceStateChangeEvent] | None = None
    worker_group: str | None = None
    worker_group_key: str | None = None
    id: str | None = None
    executor_service: ExecutorService | None = None
    num_threads: int | None = None
    tracer_factory: TracerFactory | None = None
    tracer: Tracer | None = None
    maintenance_service: MaintenanceService | None = None

    def init_metrics_and_tracer(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_metrics(self) -> set[Metric]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def enter_maintenance(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def exit_maintenance(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_deserialization_error(self, deserialization_exception: DeserializationException) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_task(self, worker_task: WorkerTask) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def publish_trigger_execution(self, worker_trigger: WorkerTrigger, evaluate: Optional[Execution]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_trigger_error(self, worker_trigger: WorkerTrigger, e: Throwable) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_realtime_trigger_error(self, worker_trigger: WorkerTrigger, e: Throwable) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_trigger(self, worker_trigger: WorkerTrigger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, worker_task: WorkerTask, clean_up: bool) -> WorkerTaskResult:
        raise NotImplementedError  # TODO: translate from Java

    def hash_task(self, run_context: RunContext, task: Task) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def dynamic_worker_results(self, dynamic_worker_results: list[WorkerTaskResult]) -> list[TaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def log_terminated(self, worker_task: WorkerTask) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def log_error(self, worker_trigger: WorkerTrigger, e: Throwable) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run_attempt(self, run_context: RunContext, worker_task: WorkerTask) -> WorkerTask:
        raise NotImplementedError  # TODO: translate from Java

    def call_job(self, worker_job_callable: AbstractWorkerCallable) -> io.kestra.core.models.flows.State.Type:
        raise NotImplementedError  # TODO: translate from Java

    def add_attempt(self, worker_task: WorkerTask, task_run_attempt: TaskRunAttempt) -> list[TaskRunAttempt]:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close_worker(self, timeout: timedelta) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_tasks_completion(self, timeout: timedelta) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def await_for_realtime_triggers(self, callables: list[AbstractWorkerCallable], timeout: timedelta) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close_queue(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def shutdown(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_worker_thread_tasks(self) -> list[WorkerJob]:
        raise NotImplementedError  # TODO: translate from Java

    def skip_graceful_termination(self, skip_graceful_termination: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self) -> ServiceType:
        raise NotImplementedError  # TODO: translate from Java
