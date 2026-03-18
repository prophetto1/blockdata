from __future__ import annotations

# Source: E:\KESTRA\scheduler\src\main\java\io\kestra\scheduler\endpoint\SchedulerEndpoint.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.scheduler.abstract_scheduler import AbstractScheduler
from engine.core.models.triggers.abstract_trigger import AbstractTrigger


@dataclass(slots=True, kw_only=True)
class SchedulerEndpoint:
    scheduler: AbstractScheduler | None = None

    def running(self) -> SchedulerEndpointResult:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SchedulerEndpointResult:
        schedulable_count: int | None = None
        schedulable: list[SchedulerEndpointSchedule] | None = None

    @dataclass(slots=True)
    class SchedulerEndpointSchedule:
        flow_id: str | None = None
        namespace: str | None = None
        revision: int | None = None
        trigger: AbstractTrigger | None = None
        next: datetime | None = None
