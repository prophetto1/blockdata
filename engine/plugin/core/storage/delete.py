from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\storage\Delete.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Delete(Task):
    """Delete a file from Kestra internal storage."""
    uri: Property[str]
    error_on_missing: Property[bool]

    def run(self, run_context: RunContext) -> Delete.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        deleted: bool | None = None
