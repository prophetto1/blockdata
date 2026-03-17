from __future__ import annotations

# Source: E:\KESTRA\scheduler\src\main\java\io\kestra\scheduler\SchedulerExecutionStateInterface.java

from typing import Any, Optional, Protocol

from engine.core.models.executions.execution import Execution


class SchedulerExecutionStateInterface(Protocol):
    def find_by_id(self, tenant_id: str, id: str) -> Optional[Execution]: ...
