from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.sheets.abstract_read import AbstractRead
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ReadRange(AbstractRead, RunnableTask):
    """Read a range from a spreadsheet"""
    range: Property[str] | None = None

    def run(self, run_context: RunContext) -> ReadRange:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        rows: list[Object] | None = None
        size: int | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    rows: list[Object] | None = None
    size: int | None = None
    uri: str | None = None
