from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\calendar\EventCreatedTrigger.java
# WARNING: Unresolved types: Calendar, DateTime, Exception, Logger, api, calendar, com, core, google, io, kestra, model, models, services, tasks

from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar, Optional

from integrations.googleworkspace.calendar.abstract_calendar_trigger import AbstractCalendarTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.airbyte.models.event import Event
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class EventCreatedTrigger(AbstractCalendarTrigger):
    """Poll Google Calendar for new events"""
    calendar_ids: Property[list[str]]
    m_a_x__e_v_e_n_t_s__p_e_r__p_o_l_l: ClassVar[int] = 2500
    interval: timedelta = Duration.ofMinutes(5)
    max_events_per_poll: Property[int] = Property.ofValue(100)
    search_query: Property[str] | None = None
    organizer_email: Property[str] | None = None
    event_status: Property[EventStatus] | None = None

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def get_read_timeout(self) -> Property[int]:
        raise NotImplementedError  # TODO: translate from Java

    def get_scopes(self) -> Property[list[str]]:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_configuration(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def check_calendar_for_new_events(self, calendar_service: Calendar, run_context: RunContext, calendar_id: str, last_created_time: datetime, logger: Logger) -> list[EventMetadata]:
        raise NotImplementedError  # TODO: translate from Java

    def is_new_event(self, event: Event, last_created_time: datetime, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def convert_to_event_metadata(self, event: Event) -> EventMetadata:
        raise NotImplementedError  # TODO: translate from Java

    def parse_date_time(self, date_time: DateTime) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def convert_event_date_time(self, event_date_time: com.google.api.services.calendar.model.EventDateTime) -> EventCreatedTrigger.EventDateTime:
        raise NotImplementedError  # TODO: translate from Java

    def convert_organizer(self, organizer: com.google.api.services.calendar.model.Event.Organizer) -> EventCreatedTrigger.Organizer:
        raise NotImplementedError  # TODO: translate from Java

    class EventStatus(str, Enum):
        CONFIRMED = "CONFIRMED"
        TENTATIVE = "TENTATIVE"
        CANCELLED = "CANCELLED"

    @dataclass(slots=True)
    class Output:
        events: list[EventMetadata] | None = None

    @dataclass(slots=True)
    class EventMetadata:
        id: str | None = None
        summary: str | None = None
        description: str | None = None
        location: str | None = None
        status: str | None = None
        html_link: str | None = None
        created: datetime | None = None
        updated: datetime | None = None
        start: EventCreatedTrigger.EventDateTime | None = None
        end: EventCreatedTrigger.EventDateTime | None = None
        organizer: EventCreatedTrigger.Organizer | None = None
        visibility: str | None = None
        event_type: str | None = None

    @dataclass(slots=True)
    class EventDateTime:
        date_time: datetime | None = None
        date: str | None = None
        time_zone: str | None = None

    @dataclass(slots=True)
    class Organizer:
        email: str | None = None
        display_name: str | None = None
        self: bool | None = None
