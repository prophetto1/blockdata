from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\runner\h2\H2WorkerTriggerResultQueue.java
# WARNING: Unresolved types: ApplicationContext, Class, Consumer, IOException, Runnable

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.runner.h2.h2_queue import H2Queue
from engine.jdbc.jdbc_worker_trigger_result_queue_service import JdbcWorkerTriggerResultQueueService
from engine.core.runners.worker_trigger_result import WorkerTriggerResult


@dataclass(slots=True, kw_only=True)
class H2WorkerTriggerResultQueue(H2Queue):
    jdbc_worker_trigger_result_queue_service: JdbcWorkerTriggerResultQueueService | None = None

    def receive(self, consumer_group: str, queue_type: Class[Any], consumer: Consumer[Either[WorkerTriggerResult, DeserializationException]]) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
