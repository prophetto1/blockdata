from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\storage\Reverse.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Reverse(Task):
    """Reverse a file (last line first) in Kestra internal storage."""
    from: Property[str]
    separator: Property[str]
    charset: Property[str]

    def run(self, run_context: RunContext) -> Reverse.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
