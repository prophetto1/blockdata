from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\storage\Split.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.storages.storage_split_interface import StorageSplitInterface
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Split(Task):
    """Split a file from Kestra internal storage."""
    from: Property[str]
    separator: Property[str]
    bytes: Property[str] | None = None
    partitions: Property[int] | None = None
    rows: Property[int] | None = None
    regex_pattern: Property[str] | None = None

    def run(self, run_context: RunContext) -> Split.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uris: list[str] | None = None
