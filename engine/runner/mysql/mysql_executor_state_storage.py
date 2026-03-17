from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlExecutorStateStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_executor_state_storage import AbstractJdbcExecutorStateStorage
from engine.core.runners.executor_state import ExecutorState
from engine.repository.mysql.mysql_repository import MysqlRepository


@dataclass(slots=True, kw_only=True)
class MysqlExecutorStateStorage(AbstractJdbcExecutorStateStorage):
    pass
