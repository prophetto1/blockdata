from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.calendar.abstract_insert_event import AbstractInsertEvent
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class InsertEvent(AbstractInsertEvent, RunnableTask):
    """Create a Google Calendar event"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        event: io | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    event: io | None = None
