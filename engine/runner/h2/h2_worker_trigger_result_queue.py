from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\runner\h2\H2WorkerTriggerResultQueue.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, Callable, ClassVar

from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.runner.h2.h2_queue import H2Queue
from engine.jdbc.jdbc_worker_trigger_result_queue_service import JdbcWorkerTriggerResultQueueService
from engine.core.runners.worker_trigger_result import WorkerTriggerResult


@dataclass(slots=True, kw_only=True)
class H2WorkerTriggerResultQueue(H2Queue):
    logger: ClassVar[Logger] = getLogger(__name__)
    jdbc_worker_trigger_result_queue_service: JdbcWorkerTriggerResultQueueService | None = None

    def receive(self, consumer_group: str, queue_type: type[Any], consumer: Callable[Either[WorkerTriggerResult, DeserializationException]]) -> Callable:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
