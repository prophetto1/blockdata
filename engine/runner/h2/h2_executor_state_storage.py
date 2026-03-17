from __future__ import annotations

# Source: E:\KESTRA\jdbc-h2\src\main\java\io\kestra\runner\h2\H2ExecutorStateStorage.java

from dataclasses import dataclass
from typing import Any

from engine.jdbc.runner.abstract_jdbc_executor_state_storage import AbstractJdbcExecutorStateStorage
from engine.core.runners.executor_state import ExecutorState
from engine.repository.h2.h2_repository import H2Repository


@dataclass(slots=True, kw_only=True)
class H2ExecutorStateStorage(AbstractJdbcExecutorStateStorage):
    pass
