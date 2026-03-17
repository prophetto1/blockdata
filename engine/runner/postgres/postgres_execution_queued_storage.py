from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\runner\postgres\PostgresExecutionQueuedStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_execution_queued_storage import AbstractJdbcExecutionQueuedStorage
from engine.core.runners.execution_queued import ExecutionQueued
from engine.repository.postgres.postgres_repository import PostgresRepository


@dataclass(slots=True, kw_only=True)
class PostgresExecutionQueuedStorage(AbstractJdbcExecutionQueuedStorage):
    pass
