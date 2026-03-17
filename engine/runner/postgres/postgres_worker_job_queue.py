from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\runner\postgres\PostgresWorkerJobQueue.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, Callable, ClassVar

from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.jdbc.jdbc_worker_job_queue_service import JdbcWorkerJobQueueService
from engine.runner.postgres.postgres_queue import PostgresQueue
from engine.core.runners.worker_job import WorkerJob
from engine.core.queues.worker_job_queue_interface import WorkerJobQueueInterface


@dataclass(slots=True, kw_only=True)
class PostgresWorkerJobQueue(PostgresQueue):
    logger: ClassVar[Logger] = getLogger(__name__)
    jdbc_worker_job_queue_service: JdbcWorkerJobQueueService | None = None

    def subscribe(self, worker_id: str, worker_group: str, consumer: Callable[Either[WorkerJob, DeserializationException]]) -> Callable:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
