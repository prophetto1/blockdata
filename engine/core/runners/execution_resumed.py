from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\ExecutionResumed.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(frozen=True, slots=True, kw_only=True)
class ExecutionResumed:
    task_run_id: str
    execution_id: str
    state: State.Type

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
