from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\JobScheduleDate.java

from dataclasses import dataclass
from typing import Any

from integrations.dbt.cloud.job_schedule_date_type import JobScheduleDateType


@dataclass(slots=True, kw_only=True)
class JobScheduleDate:
    type: JobScheduleDateType | None = None
    days: list[int] | None = None
    cron: str | None = None
