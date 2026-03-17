from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcWorkerJobRunningRepository.java
# WARNING: Unresolved types: DSLContext, io, jdbc, kestra

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar, Optional

from engine.jdbc.abstract_jdbc_repository import AbstractJdbcRepository
from engine.core.runners.worker_job_running import WorkerJobRunning
from engine.core.repositories.worker_job_running_repository_interface import WorkerJobRunningRepositoryInterface
from engine.executor.worker_job_running_state_store import WorkerJobRunningStateStore


@dataclass(slots=True, kw_only=True)
class AbstractJdbcWorkerJobRunningRepository(ABC, AbstractJdbcRepository):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    jdbc_repository: io.kestra.jdbc.AbstractJdbcRepository[WorkerJobRunning] | None = None

    def save(self, worker_job_running: WorkerJobRunning, context: DSLContext) -> WorkerJobRunning:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_key(self, key: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def find_by_key(self, uid: str) -> Optional[WorkerJobRunning]:
        raise NotImplementedError  # TODO: translate from Java

    def find_all(self) -> list[WorkerJobRunning]:
        raise NotImplementedError  # TODO: translate from Java

    def get_worker_job_with_worker_dead(self, context: DSLContext, workers_to_delete: list[str]) -> list[WorkerJobRunning]:
        raise NotImplementedError  # TODO: translate from Java
