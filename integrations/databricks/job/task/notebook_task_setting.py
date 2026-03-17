from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class NotebookTaskSetting:
    notebook_path: Property[str] | None = None
    source: Property[Source] | None = None
    base_parameters: Any | None = None

    def to_notebook_task(self, run_context: RunContext) -> NotebookTask:
        raise NotImplementedError  # TODO: translate from Java
