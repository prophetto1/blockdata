from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\ExecutionRunning.java

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.has_uid import HasUID


@dataclass(frozen=True, slots=True, kw_only=True)
class ExecutionRunning:
    namespace: str
    flow_id: str
    tenant_id: str | None = None
    execution: Execution | None = None
    concurrency_state: ConcurrencyState | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    class ConcurrencyState(str, Enum):
        CREATED = "CREATED"
        RUNNING = "RUNNING"
        QUEUED = "QUEUED"
        CANCELLED = "CANCELLED"
        FAILED = "FAILED"
        KILLED = "KILLED"
