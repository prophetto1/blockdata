from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlWorkerJobQueue.java
# WARNING: Unresolved types: ApplicationContext, Consumer, IOException, Runnable

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.jdbc.jdbc_worker_job_queue_service import JdbcWorkerJobQueueService
from engine.runner.mysql.mysql_queue import MysqlQueue
from engine.core.runners.worker_job import WorkerJob
from engine.core.queues.worker_job_queue_interface import WorkerJobQueueInterface


@dataclass(slots=True, kw_only=True)
class MysqlWorkerJobQueue(MysqlQueue):
    jdbc_worker_job_queue_service: JdbcWorkerJobQueueService | None = None

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def subscribe(self, worker_id: str, worker_group: str, consumer: Consumer[Either[WorkerJob, DeserializationException]]) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java
