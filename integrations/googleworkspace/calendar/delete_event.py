from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.calendar.abstract_calendar import AbstractCalendar
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class DeleteEvent(AbstractCalendar, RunnableTask):
    """Delete a Google Calendar event"""
    calendar_id: Property[str]
    event_id: Property[str]
    send_updates: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
