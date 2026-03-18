from __future__ import annotations

# Source: E:\KESTRA\scheduler\src\main\java\io\kestra\scheduler\SchedulerExecutionWithTrigger.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class SchedulerExecutionWithTrigger:
    execution: Execution | None = None
    trigger_context: TriggerContext | None = None
