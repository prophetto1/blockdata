from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\sheets\Read.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.googleworkspace.sheets.abstract_read import AbstractRead
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Read(AbstractRead):
    """Read all sheets from a spreadsheet"""
    selected_sheets_title: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Read.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        rows: dict[str, list[Any]] | None = None
        size: int | None = None
        uris: dict[str, str] | None = None
