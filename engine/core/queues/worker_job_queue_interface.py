from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\queues\WorkerJobQueueInterface.java

from typing import Any, Callable, Protocol

from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.core.queues.queue_interface import QueueInterface
from engine.core.runners.worker_job import WorkerJob


class WorkerJobQueueInterface(QueueInterface, Protocol):
    def subscribe(self, worker_id: str, worker_group: str, consumer: Callable[Either[WorkerJob, DeserializationException]]) -> Callable: ...
