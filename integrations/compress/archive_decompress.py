from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-compress\src\main\java\io\kestra\plugin\compress\ArchiveDecompress.java
# WARNING: Unresolved types: ArchiveInputStream, Exception, IOException, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_archive import AbstractArchive
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ArchiveDecompress(AbstractArchive):
    """Extract files from an archive"""
    from: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def read_archive(self, run_context: RunContext, archive_input_stream: ArchiveInputStream) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        files: dict[str, str] | None = None
