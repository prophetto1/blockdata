from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\calendar\UpdateEvent.java
# WARNING: Unresolved types: Attendee, CalendarTime, Exception, calendar, core, googleworkspace, io, kestra, models, plugin, tasks

from dataclasses import dataclass
from typing import Any

from integrations.googleworkspace.calendar.abstract_calendar import AbstractCalendar
from integrations.googleworkspace.calendar.abstract_insert_event import AbstractInsertEvent
from integrations.airbyte.models.event import Event
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class UpdateEvent(AbstractCalendar):
    """Update a Google Calendar event"""
    calendar_id: Property[str]
    event_id: Property[str]
    patch: Property[bool] = Property.ofValue(true)
    send_updates: Property[str] = Property.ofValue("none")
    summary: Property[str] | None = None
    description: str | None = None
    location: Property[str] | None = None
    start_time: AbstractInsertEvent.CalendarTime | None = None
    end_time: AbstractInsertEvent.CalendarTime | None = None
    attendees: list[AbstractInsertEvent.Attendee] | None = None
    status: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        event: io.kestra.plugin.googleworkspace.calendar.models.Event | None = None
