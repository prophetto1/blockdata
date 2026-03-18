from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\calendar\GetEvent.java
# WARNING: Unresolved types: Exception, calendar, core, googleworkspace, io, kestra, models, plugin, tasks

from dataclasses import dataclass
from typing import Any

from integrations.googleworkspace.calendar.abstract_calendar import AbstractCalendar
from integrations.airbyte.models.event import Event
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GetEvent(AbstractCalendar):
    """Fetch a Google Calendar event by ID"""
    calendar_id: Property[str]
    event_id: Property[str]
    always_include_email: Property[bool] = Property.ofValue(false)
    max_attendees: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        event: io.kestra.plugin.googleworkspace.calendar.models.Event | None = None
        metadata: dict[str, Any] | None = None
