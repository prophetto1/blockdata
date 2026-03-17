from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\ExecutionQueued.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.runners.execution_running import ExecutionRunning
from engine.core.models.has_uid import HasUID


@dataclass(frozen=True, slots=True, kw_only=True)
class ExecutionQueued:
    namespace: str
    flow_id: str
    execution: Execution
    date: datetime
    tenant_id: str | None = None

    @staticmethod
    def from_execution_running(execution_running: ExecutionRunning) -> ExecutionQueued:
        raise NotImplementedError  # TODO: translate from Java

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
