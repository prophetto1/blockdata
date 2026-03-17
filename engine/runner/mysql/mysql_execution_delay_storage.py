from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlExecutionDelayStorage.java
# WARNING: Unresolved types: Temporal

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_execution_delay_storage import AbstractJdbcExecutionDelayStorage
from engine.core.runners.execution_delay import ExecutionDelay
from engine.repository.mysql.mysql_repository import MysqlRepository


@dataclass(slots=True, kw_only=True)
class MysqlExecutionDelayStorage(AbstractJdbcExecutionDelayStorage):

    def get_now(self) -> Temporal:
        raise NotImplementedError  # TODO: translate from Java
