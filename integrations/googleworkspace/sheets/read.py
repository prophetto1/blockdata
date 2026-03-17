from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.sheets.abstract_read import AbstractRead
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Read(AbstractRead, RunnableTask):
    """Read all sheets from a spreadsheet"""
    selected_sheets_title: Property[list[String]] | None = None

    def run(self, run_context: RunContext) -> Read:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        rows: dict[String, List[Object]] | None = None
        size: int | None = None
        uris: dict[String, URI] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    rows: dict[String, List[Object]] | None = None
    size: int | None = None
    uris: dict[String, URI] | None = None
