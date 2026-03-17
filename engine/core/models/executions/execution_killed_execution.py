from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\ExecutionKilledExecution.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.core.models.flows.state import State
from engine.core.models.tenant_interface import TenantInterface
from engine.core.models.flows.type import Type
from engine.core.runners.worker_task import WorkerTask


@dataclass(slots=True, kw_only=True)
class ExecutionKilledExecution(ExecutionKilled):
    execution_id: str
    type: str = "execution"
    execution_state: io.kestra.core.models.flows.State.Type | None = None
    is_on_kill_cascade: bool | None = None

    def is_equal(self, worker_task: WorkerTask) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
