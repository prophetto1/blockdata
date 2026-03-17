from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlWorkerTriggerResultQueue.java
# WARNING: Unresolved types: ApplicationContext, Class, Consumer, IOException, Runnable

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.jdbc.jdbc_worker_trigger_result_queue_service import JdbcWorkerTriggerResultQueueService
from engine.runner.mysql.mysql_queue import MysqlQueue
from engine.core.runners.worker_trigger_result import WorkerTriggerResult


@dataclass(slots=True, kw_only=True)
class MysqlWorkerTriggerResultQueue(MysqlQueue):
    jdbc_worker_trigger_result_queue_service: JdbcWorkerTriggerResultQueueService | None = None

    def receive(self, consumer_group: str, queue_type: Class[Any], consumer: Consumer[Either[WorkerTriggerResult, DeserializationException]]) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
