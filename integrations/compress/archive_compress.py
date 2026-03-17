from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.compress.abstract_archive import AbstractArchive
from engine.core.models.property.data import Data
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ArchiveCompress(AbstractArchive, RunnableTask, Data):
    """Create an archive from multiple files"""
    from: Any

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def write_archive(self, run_context: RunContext, archive_input_stream: ArchiveOutputStream) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
