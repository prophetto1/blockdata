from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\state\Set.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.state.abstract_state import AbstractState
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Set(AbstractState):
    """Set state in the legacy state store (deprecated)."""
    data: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
        key: str | None = None
