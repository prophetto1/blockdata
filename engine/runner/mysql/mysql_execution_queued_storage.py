from __future__ import annotations

# Source: E:\KESTRA\jdbc-mysql\src\main\java\io\kestra\runner\mysql\MysqlExecutionQueuedStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_execution_queued_storage import AbstractJdbcExecutionQueuedStorage
from engine.core.runners.execution_queued import ExecutionQueued
from engine.repository.mysql.mysql_repository import MysqlRepository


@dataclass(slots=True, kw_only=True)
class MysqlExecutionQueuedStorage(AbstractJdbcExecutionQueuedStorage):
    pass
