from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\JdbcWorkerJobQueueService.java
# WARNING: Unresolved types: AtomicReference

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, Callable, ClassVar

from engine.jdbc.repository.abstract_jdbc_worker_job_running_repository import AbstractJdbcWorkerJobRunningRepository
from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.jdbc.runner.jdbc_queue import JdbcQueue
from engine.core.runners.worker_job import WorkerJob


@dataclass(slots=True, kw_only=True)
class JdbcWorkerJobQueueService:
    disposable: AtomicReference[Callable]
    is_stopped: bool
    logger: ClassVar[Logger] = getLogger(__name__)
    jdbc_worker_job_running_repository: AbstractJdbcWorkerJobRunningRepository | None = None

    def subscribe(self, worker_job_queue: JdbcQueue[WorkerJob], worker_id: str, worker_group: str, consumer: Callable[Either[WorkerJob, DeserializationException]]) -> Callable:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
