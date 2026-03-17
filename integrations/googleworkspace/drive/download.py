from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.drive.abstract_drive import AbstractDrive
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Download(AbstractDrive, RunnableTask):
    """Download a Drive file to Kestra storage"""
    file_id: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None
        file: io | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
    file: io | None = None
