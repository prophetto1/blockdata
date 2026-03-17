from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.calendar.abstract_calendar import AbstractCalendar
from engine.webserver.models.events.event import Event
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractInsertEvent(AbstractCalendar):
    calendar_id: Property[str]
    summary: Property[str]
    description: str | None = None
    location: Property[str] | None = None
    start_time: CalendarTime
    end_time: CalendarTime
    creator: Attendee | None = None
    attendees: list[Attendee] | None = None

    def event(self, run_context: RunContext) -> Event:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CalendarTime:
        date_time: Property[str] | None = None
        time_zone: Property[str] | None = None

    @dataclass(slots=True)
    class Attendee:
        display_name: Property[str] | None = None
        email: Property[str] | None = None


@dataclass(slots=True, kw_only=True)
class CalendarTime:
    date_time: Property[str] | None = None
    time_zone: Property[str] | None = None


@dataclass(slots=True, kw_only=True)
class Attendee:
    display_name: Property[str] | None = None
    email: Property[str] | None = None
