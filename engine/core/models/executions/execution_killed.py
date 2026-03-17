from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\ExecutionKilled.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution_killed_execution import ExecutionKilledExecution
from engine.core.models.executions.execution_killed_trigger import ExecutionKilledTrigger
from engine.core.models.has_u_i_d import HasUID
from engine.core.models.tenant_interface import TenantInterface


@dataclass(slots=True, kw_only=True)
class ExecutionKilled:
    state: State | None = None
    tenant_id: str | None = None

    def get_type(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    class State(str, Enum):
        REQUESTED = "REQUESTED"
        EXECUTED = "EXECUTED"
