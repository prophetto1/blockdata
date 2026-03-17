from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\SubflowExecutionEnd.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.has_u_i_d import HasUID
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type
from engine.core.models.executions.variables import Variables


@dataclass(slots=True, kw_only=True)
class SubflowExecutionEnd:
    child_execution: Execution | None = None
    parent_execution_id: str | None = None
    task_run_id: str | None = None
    task_id: str | None = None
    state: State.Type | None = None
    outputs: Variables | None = None

    def to_string_state(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
