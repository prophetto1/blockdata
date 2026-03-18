from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-compress\src\main\java\io\kestra\plugin\compress\ArchiveCompress.java
# WARNING: Unresolved types: ArchiveOutputStream, Exception, From, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_archive import AbstractArchive
from integrations.datagen.data import Data
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ArchiveCompress(AbstractArchive):
    """Create an archive from multiple files"""
    from: Any

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def write_archive(self, run_context: RunContext, archive_input_stream: ArchiveOutputStream) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
