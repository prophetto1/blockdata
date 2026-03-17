from __future__ import annotations

# Source: E:\KESTRA\scheduler\src\main\java\io\kestra\scheduler\AbstractScheduler.java
# WARNING: Unresolved types: AtomicReference, ConcurrentHashMap, ScheduledExecutorService, ScheduledFuture, ServiceState

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import datetime
from datetime import timedelta
from typing import Any, Callable, ClassVar, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.services.condition_service import ConditionService
from engine.core.events.crud_event import CrudEvent
from engine.core.models.executions.execution import Execution
from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.core.services.flow_listeners_interface import FlowListenersInterface
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.exceptions.internal_exception import InternalException
from engine.core.exceptions.invalid_trigger_configuration_exception import InvalidTriggerConfigurationException
from engine.core.models.executions.log_entry import LogEntry
from engine.core.services.maintenance_service import MaintenanceService
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.services.plugin_default_service import PluginDefaultService
from engine.core.queues.queue_interface import QueueInterface
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.runners.run_context_initializer import RunContextInitializer
from engine.core.models.triggers.schedulable import Schedulable
from engine.core.runners.schedule_context_interface import ScheduleContextInterface
from engine.core.runners.scheduler import Scheduler
from engine.scheduler.scheduler_execution_state_interface import SchedulerExecutionStateInterface
from engine.scheduler.scheduler_execution_with_trigger import SchedulerExecutionWithTrigger
from engine.core.runners.scheduler_trigger_state_interface import SchedulerTriggerStateInterface
from engine.core.server.service_state_change_event import ServiceStateChangeEvent
from engine.core.server.service_type import ServiceType
from engine.core.models.triggers.trigger import Trigger
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.runners.worker_group_executor_interface import WorkerGroupExecutorInterface
from engine.core.services.worker_group_service import WorkerGroupService
from engine.core.runners.worker_job import WorkerJob
from engine.core.runners.worker_trigger_result import WorkerTriggerResult


@dataclass(slots=True, kw_only=True)
class AbstractScheduler(ABC):
    schedule_executor: ScheduledExecutorService
    execution_monitor_executor: ScheduledExecutorService
    schedulable_next_date: dict[str, FlowWithWorkerTriggerNextDate]
    id: str
    shutdown: bool
    is_paused: bool
    state: AtomicReference[ServiceState]
    logger: ClassVar[Logger] = getLogger(__name__)
    is_ready: bool = False
    schedulable: list[FlowWithTriggers] = field(default_factory=list)
    receive_cancellations: list[Callable] = field(default_factory=list)
    application_context: ApplicationContext | None = None
    execution_queue: QueueInterface[Execution] | None = None
    trigger_queue: QueueInterface[Trigger] | None = None
    worker_job_queue: QueueInterface[WorkerJob] | None = None
    worker_trigger_result_queue: QueueInterface[WorkerTriggerResult] | None = None
    execution_killed_queue: QueueInterface[ExecutionKilled] | None = None
    log_queue: QueueInterface[LogEntry] | None = None
    flow_listeners: FlowListenersInterface | None = None
    run_context_factory: RunContextFactory | None = None
    run_context_initializer: RunContextInitializer | None = None
    metric_registry: MetricRegistry | None = None
    condition_service: ConditionService | None = None
    plugin_default_service: PluginDefaultService | None = None
    worker_group_service: WorkerGroupService | None = None
    execution_state: SchedulerExecutionStateInterface | None = None
    worker_group_executor_interface: WorkerGroupExecutorInterface | None = None
    maintenance_service: MaintenanceService | None = None
    scheduled_future: ScheduledFuture[Any] | None = None
    execution_monitor_future: ScheduledFuture[Any] | None = None
    trigger_state: SchedulerTriggerStateInterface | None = None
    service_state_event_publisher: ApplicationEventPublisher[ServiceStateChangeEvent] | None = None
    execution_event_publisher: ApplicationEventPublisher[CrudEvent[Execution]] | None = None

    def is_ready(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def initialized_triggers(self, flows: list[FlowWithSource]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def enter_maintenance(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def exit_maintenance(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def resume_additional_queues(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def pause_additional_queues(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def next_evaluation_date(self, abstract_trigger: AbstractTrigger, condition_context: ConditionContext | None = None, last: Optional[Any] | None = None) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def interval(self, abstract_trigger: AbstractTrigger) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def compute_schedulable(self, flows: list[FlowWithSource], trigger_contexts_to_evaluate: list[Trigger], schedule_context: ScheduleContextInterface) -> list[FlowWithTriggers]:
        raise NotImplementedError  # TODO: translate from Java

    def disable_invalid_trigger(self, flow: FlowWithSource, trigger: AbstractTrigger, e: BaseException | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def handle_next(self, flows: list[FlowWithSource], now: datetime, consumer: Callable[list[Trigger], ScheduleContextInterface]) -> None:
        ...

    def scheduler_triggers(self) -> list[FlowWithTriggers]:
        raise NotImplementedError  # TODO: translate from Java

    def handle(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_flows_with_defaults(self) -> list[FlowWithSource]:
        raise NotImplementedError  # TODO: translate from Java

    def handle_evaluate_worker_trigger_result(self, result: SchedulerExecutionWithTrigger, next_execution_date: datetime, abstract_trigger: AbstractTrigger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_evaluate_scheduling_trigger_result(self, schedule: Schedulable, result: SchedulerExecutionWithTrigger, condition_context: ConditionContext, schedule_context: ScheduleContextInterface) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def save_last_trigger_and_emit_execution(self, execution: Execution, trigger: Trigger, save_action: Callable[Trigger]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def emit_execution(self, execution: Execution, trigger: TriggerContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fail(self, message: Execution, e: Exception) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def execution_monitor(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, execution_with_trigger: SchedulerExecutionWithTrigger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def now() -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate_schedule_trigger(self, flow_with_trigger: FlowWithWorkerTrigger) -> Optional[SchedulerExecutionWithTrigger]:
        raise NotImplementedError  # TODO: translate from Java

    def create_failed_execution(self, flow_with_trigger: FlowWithWorkerTrigger, e: BaseException) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def handle_failed_evaluated_trigger(self, flow_with_trigger: FlowWithWorkerTrigger, schedule_context: ScheduleContextInterface, e: BaseException) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def log_error(self, condition_context: ConditionContext, flow: FlowWithSource, trigger: AbstractTrigger | None = None, e: BaseException | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def send_worker_trigger_to_worker(self, flow_with_trigger: FlowWithWorkerTrigger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self, on_close: Callable | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self) -> ServiceType:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class FlowWithWorkerTrigger:
        flow: FlowWithSource | None = None
        abstract_trigger: AbstractTrigger | None = None
        trigger_context: Trigger | None = None
        condition_context: ConditionContext | None = None

        def from(self, flow: FlowWithSource) -> FlowWithWorkerTrigger:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class FlowWithWorkerTriggerNextDate(FlowWithWorkerTrigger):
        next: datetime | None = None

        @staticmethod
        def of(f: FlowWithWorkerTrigger) -> FlowWithWorkerTriggerNextDate:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class FlowWithTriggers:
        flow: FlowWithSource | None = None
        abstract_trigger: AbstractTrigger | None = None
        trigger_context: Trigger | None = None
        condition_context: ConditionContext | None = None

        def uid(self) -> str:
            raise NotImplementedError  # TODO: translate from Java
