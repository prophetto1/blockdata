from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-compress\src\main\java\io\kestra\plugin\compress\FileCompress.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_file import AbstractFile
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class FileCompress(AbstractFile):
    """Compress a single file"""
    from: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
