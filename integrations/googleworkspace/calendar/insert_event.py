from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\calendar\InsertEvent.java
# WARNING: Unresolved types: Exception, calendar, core, googleworkspace, io, kestra, models, plugin, tasks

from dataclasses import dataclass
from typing import Any

from integrations.googleworkspace.calendar.abstract_insert_event import AbstractInsertEvent
from integrations.airbyte.models.event import Event
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class InsertEvent(AbstractInsertEvent):
    """Create a Google Calendar event"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        event: io.kestra.plugin.googleworkspace.calendar.models.Event | None = None
