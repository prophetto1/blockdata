from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.drive.abstract_create import AbstractCreate
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Create(AbstractCreate, RunnableTask):
    """Create a file or folder in Drive"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        file: io | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    file: io | None = None
