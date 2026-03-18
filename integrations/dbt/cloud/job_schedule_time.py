from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\JobScheduleTime.java

from dataclasses import dataclass
from typing import Any

from integrations.dbt.cloud.job_schedule_time_type import JobScheduleTimeType


@dataclass(slots=True, kw_only=True)
class JobScheduleTime:
    type: JobScheduleTimeType | None = None
    interval: int | None = None
    hours: list[int] | None = None
