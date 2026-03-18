from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\calendar\ListEvents.java
# WARNING: Unresolved types: Exception, calendar, core, googleworkspace, io, kestra, models, plugin, tasks

from dataclasses import dataclass
from typing import Any

from integrations.googleworkspace.calendar.abstract_calendar import AbstractCalendar
from integrations.airbyte.models.event import Event
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ListEvents(AbstractCalendar):
    """List Google Calendar events with filters"""
    calendar_id: Property[str]
    single_events: Property[bool] = Property.ofValue(true)
    show_deleted: Property[bool] = Property.ofValue(false)
    time_min: Property[str] | None = None
    time_max: Property[str] | None = None
    q: Property[str] | None = None
    order_by: Property[str] | None = None
    max_results: Property[int] | None = None
    page_token: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        events: list[io.kestra.plugin.googleworkspace.calendar.models.Event] | None = None
        metadata_list: list[dict[str, Any]] | None = None
        next_page_token: str | None = None
