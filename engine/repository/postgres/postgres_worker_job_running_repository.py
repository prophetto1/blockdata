from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresWorkerJobRunningRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_worker_job_running_repository import AbstractJdbcWorkerJobRunningRepository
from engine.repository.postgres.postgres_repository import PostgresRepository
from engine.core.runners.worker_job_running import WorkerJobRunning


@dataclass(slots=True, kw_only=True)
class PostgresWorkerJobRunningRepository(AbstractJdbcWorkerJobRunningRepository):
    pass
