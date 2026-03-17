from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\JdbcWorkerTriggerResultQueueService.java
# WARNING: Unresolved types: AtomicBoolean, AtomicReference, Class, Closeable, Consumer, ObjectMapper, Runnable

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.jdbc.runner.jdbc_queue import JdbcQueue
from engine.executor.worker_job_running_state_store import WorkerJobRunningStateStore
from engine.core.runners.worker_trigger_result import WorkerTriggerResult


@dataclass(slots=True, kw_only=True)
class JdbcWorkerTriggerResultQueueService:
    m_a_p_p_e_r: ObjectMapper = JdbcMapper.of()
    disposable: AtomicReference[Runnable] = new AtomicReference<>()
    is_closed: AtomicBoolean = new AtomicBoolean(false)
    worker_job_running_state_store: WorkerJobRunningStateStore | None = None

    def receive(self, worker_trigger_result_queue: JdbcQueue[WorkerTriggerResult], consumer_group: str, queue_type: Class[Any], consumer: Consumer[Either[WorkerTriggerResult, DeserializationException]]) -> Runnable:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
