from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\JdbcWorkerTriggerResultQueueService.java
# WARNING: Unresolved types: AtomicBoolean, AtomicReference, Class, Closeable, Consumer, ObjectMapper, Runnable

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.jdbc.runner.jdbc_queue import JdbcQueue
from engine.executor.worker_job_running_state_store import WorkerJobRunningStateStore
from engine.core.runners.worker_trigger_result import WorkerTriggerResult


@dataclass(slots=True, kw_only=True)
class JdbcWorkerTriggerResultQueueService:
    mapper: ClassVar[ObjectMapper]
    disposable: AtomicReference[Runnable]
    is_closed: AtomicBoolean
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    worker_job_running_state_store: WorkerJobRunningStateStore | None = None

    def receive(self, worker_trigger_result_queue: JdbcQueue[WorkerTriggerResult], consumer_group: str, queue_type: Class[Any], consumer: Consumer[Either[WorkerTriggerResult, DeserializationException]]) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
