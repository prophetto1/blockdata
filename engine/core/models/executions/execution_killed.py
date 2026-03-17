from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\ExecutionKilled.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.models.executions.execution_killed_execution import ExecutionKilledExecution
from engine.core.models.executions.execution_killed_trigger import ExecutionKilledTrigger
from engine.core.models.has_uid import HasUID
from engine.core.models.tenant_interface import TenantInterface


@dataclass(slots=True, kw_only=True)
class ExecutionKilled(ABC):
    state: State | None = None
    tenant_id: str | None = None

    @abstractmethod
    def get_type(self) -> str:
        ...

    class State(str, Enum):
        REQUESTED = "REQUESTED"
        EXECUTED = "EXECUTED"
