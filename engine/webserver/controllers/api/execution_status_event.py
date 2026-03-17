from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\ExecutionStatusEvent.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class ExecutionStatusEvent:
    execution_id: str | None = None
    tenant_id: str | None = None
    namespace: str | None = None
    flow_id: str | None = None
    state: State | None = None

    @staticmethod
    def of(execution: Execution) -> ExecutionStatusEvent:
        raise NotImplementedError  # TODO: translate from Java
