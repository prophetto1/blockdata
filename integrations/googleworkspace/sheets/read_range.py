from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\sheets\ReadRange.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.googleworkspace.sheets.abstract_read import AbstractRead
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ReadRange(AbstractRead):
    """Read a range from a spreadsheet"""
    range: Property[str] | None = None

    def run(self, run_context: RunContext) -> ReadRange.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        rows: list[Any] | None = None
        size: int | None = None
        uri: str | None = None
