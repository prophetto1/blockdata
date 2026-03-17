from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.dbt.cloud.job_schedule_time_type import JobScheduleTimeType


@dataclass(slots=True, kw_only=True)
class JobScheduleTime:
    type: JobScheduleTimeType | None = None
    interval: int | None = None
    hours: list[Integer] | None = None
