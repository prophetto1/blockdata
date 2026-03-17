from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\ExecutionDelay.java

from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from typing import Any

from engine.core.models.has_u_i_d import HasUID
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ExecutionDelay:
    task_run_id: str
    execution_id: str
    date: datetime
    state: State.Type
    delay_type: DelayType

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_delay_type(self) -> DelayType:
        raise NotImplementedError  # TODO: translate from Java

    class DelayType(str, Enum):
        RESUME_FLOW = "RESUME_FLOW"
        RESTART_FAILED_TASK = "RESTART_FAILED_TASK"
        RESTART_FAILED_FLOW = "RESTART_FAILED_FLOW"
        CONTINUE_FLOWABLE = "CONTINUE_FLOWABLE"
