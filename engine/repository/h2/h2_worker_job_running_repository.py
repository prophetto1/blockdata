from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\repository\h2\H2WorkerJobRunningRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_worker_job_running_repository import AbstractJdbcWorkerJobRunningRepository
from engine.repository.h2.h2_repository import H2Repository
from engine.core.runners.worker_job_running import WorkerJobRunning


@dataclass(slots=True, kw_only=True)
class H2WorkerJobRunningRepository(AbstractJdbcWorkerJobRunningRepository):
    pass
