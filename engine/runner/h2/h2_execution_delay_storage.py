from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\runner\h2\H2ExecutionDelayStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_execution_delay_storage import AbstractJdbcExecutionDelayStorage
from engine.core.runners.execution_delay import ExecutionDelay
from engine.repository.h2.h2_repository import H2Repository


@dataclass(slots=True, kw_only=True)
class H2ExecutionDelayStorage(AbstractJdbcExecutionDelayStorage):
    pass
