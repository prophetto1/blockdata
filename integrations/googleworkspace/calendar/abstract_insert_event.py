from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\calendar\AbstractInsertEvent.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.googleworkspace.calendar.abstract_calendar import AbstractCalendar
from integrations.airbyte.models.event import Event
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractInsertEvent(ABC, AbstractCalendar):
    calendar_id: Property[str]
    summary: Property[str]
    start_time: CalendarTime
    end_time: CalendarTime
    description: str | None = None
    location: Property[str] | None = None
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
