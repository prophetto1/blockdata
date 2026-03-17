from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\SubflowExecutionResult.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.has_u_i_d import HasUID
from engine.core.models.flows.state import State
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class SubflowExecutionResult:
    parent_task_run: TaskRun
    execution_id: str
    state: State.Type

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
