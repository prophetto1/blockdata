from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\MultipleConditionEvent.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow import Flow
from engine.core.models.has_uid import HasUID


@dataclass(slots=True, kw_only=True)
class MultipleConditionEvent:
    flow: Flow | None = None
    execution: Execution | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
