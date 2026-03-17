from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\state\Delete.java

from dataclasses import dataclass
from typing import Any

from engine.plugin.core.state.abstract_state import AbstractState
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractState):
    """Delete state from the legacy state store (deprecated)."""
    error_on_missing: Property[bool]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        deleted: bool | None = None
