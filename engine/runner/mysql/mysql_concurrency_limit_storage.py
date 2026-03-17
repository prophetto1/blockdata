from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlConcurrencyLimitStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_concurrency_limit_storage import AbstractJdbcConcurrencyLimitStorage
from engine.core.runners.concurrency_limit import ConcurrencyLimit
from engine.repository.mysql.mysql_repository import MysqlRepository


@dataclass(slots=True, kw_only=True)
class MysqlConcurrencyLimitStorage(AbstractJdbcConcurrencyLimitStorage):
    pass
