from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.dbt.cloud.job_schedule_date_type import JobScheduleDateType


@dataclass(slots=True, kw_only=True)
class JobScheduleDate:
    type: JobScheduleDateType | None = None
    days: list[Integer] | None = None
    cron: str | None = None
