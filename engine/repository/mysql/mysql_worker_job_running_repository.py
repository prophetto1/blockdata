from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\repository\mysql\MysqlWorkerJobRunningRepository.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_worker_job_running_repository import AbstractJdbcWorkerJobRunningRepository
from engine.repository.mysql.mysql_repository import MysqlRepository
from engine.core.runners.worker_job_running import WorkerJobRunning


@dataclass(slots=True, kw_only=True)
class MysqlWorkerJobRunningRepository(AbstractJdbcWorkerJobRunningRepository):
    pass
