from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\runner\postgres\PostgresExecutionDelayStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_execution_delay_storage import AbstractJdbcExecutionDelayStorage
from engine.core.runners.execution_delay import ExecutionDelay
from engine.repository.postgres.postgres_repository import PostgresRepository


@dataclass(slots=True, kw_only=True)
class PostgresExecutionDelayStorage(AbstractJdbcExecutionDelayStorage):
    pass
