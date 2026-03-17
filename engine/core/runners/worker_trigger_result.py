from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\WorkerTriggerResult.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.executions.execution import Execution
from engine.core.models.has_u_i_d import HasUID
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class WorkerTriggerResult:
    trigger_context: TriggerContext
    trigger: AbstractTrigger
    execution: Optional[Execution] | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
