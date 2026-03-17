from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.calendar.abstract_calendar import AbstractCalendar
from integrations.googleworkspace.calendar.abstract_insert_event import AbstractInsertEvent
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class UpdateEvent(AbstractCalendar, RunnableTask):
    """Update a Google Calendar event"""
    calendar_id: Property[str]
    event_id: Property[str]
    patch: Property[bool] | None = None
    send_updates: Property[str] | None = None
    summary: Property[str] | None = None
    description: str | None = None
    location: Property[str] | None = None
    start_time: AbstractInsertEvent | None = None
    end_time: AbstractInsertEvent | None = None
    attendees: list[AbstractInsertEvent] | None = None
    status: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        event: io | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    event: io | None = None
