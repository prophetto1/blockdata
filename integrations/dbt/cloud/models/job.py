from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.dbt.cloud.models.job_schedule import JobSchedule
from integrations.dbt.cloud.models.job_settings import JobSettings
from integrations.dbt.cloud.models.job_triggers import JobTriggers


@dataclass(slots=True, kw_only=True)
class Job:
    id: int | None = None
    account_id: int | None = None
    project_id: int | None = None
    environment_id: int | None = None
    name: str | None = None
    dbt_version: str | None = None
    triggers: JobTriggers | None = None
    execute_steps: list[String] | None = None
    settings: JobSettings | None = None
    state: int | None = None
    generate_docs: bool | None = None
    schedule: JobSchedule | None = None
