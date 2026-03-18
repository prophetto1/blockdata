from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\runner\postgres\PostgresConcurrencyLimitStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_concurrency_limit_storage import AbstractJdbcConcurrencyLimitStorage
from engine.core.runners.concurrency_limit import ConcurrencyLimit
from engine.repository.postgres.postgres_repository import PostgresRepository


@dataclass(slots=True, kw_only=True)
class PostgresConcurrencyLimitStorage(AbstractJdbcConcurrencyLimitStorage):
    pass
