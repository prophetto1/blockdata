from __future__ import annotations

# Source: E:\KESTRA\scheduler\src\main\java\io\kestra\scheduler\SchedulerExecutionState.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.repositories.execution_repository_interface import ExecutionRepositoryInterface
from engine.scheduler.scheduler_execution_state_interface import SchedulerExecutionStateInterface


@dataclass(slots=True, kw_only=True)
class SchedulerExecutionState:
    execution_repository: ExecutionRepositoryInterface | None = None

    def find_by_id(self, tenant_id: str, id: str) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
