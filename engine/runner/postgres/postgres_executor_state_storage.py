from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\runner\postgres\PostgresExecutorStateStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_executor_state_storage import AbstractJdbcExecutorStateStorage
from engine.core.runners.executor_state import ExecutorState
from engine.repository.postgres.postgres_repository import PostgresRepository


@dataclass(slots=True, kw_only=True)
class PostgresExecutorStateStorage(AbstractJdbcExecutorStateStorage):
    pass
