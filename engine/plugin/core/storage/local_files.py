from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\storage\LocalFiles.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class LocalFiles(Task):
    """Create temporary files (Deprecated)."""
    inputs: Any | None = None
    outputs: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> LocalFilesOutput:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class LocalFilesOutput:
        uris: dict[str, str] | None = None
