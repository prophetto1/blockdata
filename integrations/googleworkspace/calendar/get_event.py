from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.calendar.abstract_calendar import AbstractCalendar
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GetEvent(AbstractCalendar, RunnableTask):
    """Fetch a Google Calendar event by ID"""
    calendar_id: Property[str]
    event_id: Property[str]
    max_attendees: Property[int] | None = None
    always_include_email: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        event: io | None = None
        metadata: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    event: io | None = None
    metadata: dict[String, Object] | None = None
