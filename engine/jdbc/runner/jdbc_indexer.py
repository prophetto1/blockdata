from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcIndexer.java
# WARNING: Unresolved types: ApplicationEventPublisher, AtomicBoolean, AtomicReference, IOException, Runnable, ServiceState, T

from dataclasses import dataclass, field
from typing import Any

from engine.core.services.ignore_execution_service import IgnoreExecutionService
from engine.core.runners.indexer import Indexer
from engine.jdbc.runner.jdbc_queue import JdbcQueue
from engine.core.models.executions.log_entry import LogEntry
from engine.core.repositories.log_repository_interface import LogRepositoryInterface
from engine.core.models.executions.metric_entry import MetricEntry
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.repositories.metric_repository_interface import MetricRepositoryInterface
from engine.core.queues.queue_interface import QueueInterface
from engine.core.queues.queue_service import QueueService
from engine.core.repositories.save_repository_interface import SaveRepositoryInterface
from engine.core.server.service_state_change_event import ServiceStateChangeEvent
from engine.core.server.service_type import ServiceType


@dataclass(slots=True, kw_only=True)
class JdbcIndexer:
    receive_cancellations: list[Runnable] = field(default_factory=list)
    id: str = IdUtils.create()
    state: AtomicReference[ServiceState] = new AtomicReference<>()
    closed: AtomicBoolean = new AtomicBoolean(false)
    log_repository: LogRepositoryInterface | None = None
    log_queue: JdbcQueue[LogEntry] | None = None
    metric_repository: MetricRepositoryInterface | None = None
    metric_queue: JdbcQueue[MetricEntry] | None = None
    metric_registry: MetricRegistry | None = None
    event_publisher: ApplicationEventPublisher[ServiceStateChangeEvent] | None = None
    ignore_execution_service: IgnoreExecutionService | None = None
    queue_service: QueueService | None = None

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def start_queues(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def send_batch(self, queue_interface: JdbcQueue[T], save_repository_interface: SaveRepositoryInterface[T]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self) -> ServiceType:
        raise NotImplementedError  # TODO: translate from Java

    def get_state(self) -> ServiceState:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop_queue(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
