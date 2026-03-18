from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\utils\TestsUtils.java
# WARNING: Unresolved types: Entry, JsonProcessingException, StackTraceElement, ThreadLocal, URISyntaxException

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import timedelta
from typing import Any, Callable, ClassVar

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.repositories.local_flow_repository_loader import LocalFlowRepositoryLoader
from engine.core.models.executions.log_entry import LogEntry
from engine.core.queues.queue_interface import QueueInterface
from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.triggers.trigger import Trigger


@dataclass(slots=True, kw_only=True)
class TestsUtils(ABC):
    queue_consumers_cancellations: ClassVar[ThreadLocal[list[Callable]]]
    mapper: ClassVar[ObjectMapper]
    logger: ClassVar[Logger] = getLogger(__name__)

    @staticmethod
    def queue_consumers_cleanup() -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def random_namespace() -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def random_tenant() -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def stack_trace_to_parts() -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def random_string() -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def map(path: str, cls: type[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def loads(tenant_id: str, repository_loader: LocalFlowRepositoryLoader, url: str | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def filter_logs(logs: list[LogEntry], task_run: TaskRun) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def await_log(logs: list[LogEntry], log_matcher: Callable[LogEntry]) -> LogEntry:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def await_logs(logs: list[LogEntry], log_matcher: Callable[LogEntry], exact_count: int | None = None) -> list[LogEntry]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def mock_flow(tenant: str | None = None, caller: StackTraceElement | None = None) -> Flow:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def mock_execution(flow: FlowInterface, inputs: dict[str, Any], outputs: dict[str, Any] | None = None) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def mock_task_run(execution: Execution, task: Task) -> TaskRun:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def mock_trigger(run_context_factory: RunContextFactory, trigger: AbstractTrigger) -> Map.Entry[ConditionContext, Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def mock_run_context(tenant: str, run_context_factory: RunContextFactory, task: Task, inputs: dict[str, Any] | None = None) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def receive(queue: QueueInterface[T], consumer_group: str | None = None, queue_type: type[Any] | None = None, consumer: Callable[Either[T, DeserializationException]] | None = None, timeout: timedelta | None = None) -> Flux[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def property_from_list(list: list[T]) -> Property[list[T]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def stringify(object: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java
