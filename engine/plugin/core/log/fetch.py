from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\log\Fetch.java
# WARNING: Unresolved types: Exception, Level, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Fetch(Task):
    """Fetch execution logs to a file (deprecated)."""
    level: Property[Level] = Property.ofValue(Level.INFO)
    namespace: Property[str] | None = None
    flow_id: Property[str] | None = None
    execution_id: Property[str] | None = None
    tasks_id: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
        uri: str | None = None
