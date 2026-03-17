from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.calendar.abstract_calendar import AbstractCalendar
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ListEvents(AbstractCalendar, RunnableTask):
    """List Google Calendar events with filters"""
    calendar_id: Property[str]
    time_min: Property[str] | None = None
    time_max: Property[str] | None = None
    q: Property[str] | None = None
    single_events: Property[bool] | None = None
    order_by: Property[str] | None = None
    show_deleted: Property[bool] | None = None
    max_results: Property[int] | None = None
    page_token: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        events: list[io] | None = None
        metadata_list: list[Map[String, Object]] | None = None
        next_page_token: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    events: list[io] | None = None
    metadata_list: list[Map[String, Object]] | None = None
    next_page_token: str | None = None
