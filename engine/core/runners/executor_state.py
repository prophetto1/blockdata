from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\ExecutorState.java
# WARNING: Unresolved types: ConcurrentHashMap

from dataclasses import dataclass
from typing import Any

from engine.core.models.has_u_i_d import HasUID
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ExecutorState:
    worker_task_deduplication: dict[str, State.Type] = new ConcurrentHashMap<>()
    child_deduplication: dict[str, str] = new ConcurrentHashMap<>()
    subflow_execution_deduplication: dict[str, State.Type] = new ConcurrentHashMap<>()
    execution_id: str | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
