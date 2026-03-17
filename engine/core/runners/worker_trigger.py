from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\WorkerTrigger.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.triggers.trigger import Trigger
from engine.core.runners.worker_job import WorkerJob


@dataclass(slots=True, kw_only=True)
class WorkerTrigger(WorkerJob):
    trigger: AbstractTrigger
    trigger_context: Trigger
    condition_context: ConditionContext
    t_y_p_e: ClassVar[str] = "trigger"
    type: str = TYPE

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
