from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\JdbcWorkerJobQueueService.java
# WARNING: Unresolved types: ApplicationContext, AtomicBoolean, AtomicReference, Closeable, Consumer, Runnable

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_worker_job_running_repository import AbstractJdbcWorkerJobRunningRepository
from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.jdbc.runner.jdbc_queue import JdbcQueue
from engine.core.runners.worker_job import WorkerJob


@dataclass(slots=True, kw_only=True)
class JdbcWorkerJobQueueService:
    disposable: AtomicReference[Runnable] = new AtomicReference<>()
    is_stopped: AtomicBoolean = new AtomicBoolean(false)
    jdbc_worker_job_running_repository: AbstractJdbcWorkerJobRunningRepository | None = None

    def subscribe(self, worker_job_queue: JdbcQueue[WorkerJob], worker_id: str, worker_group: str, consumer: Consumer[Either[WorkerJob, DeserializationException]]) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
