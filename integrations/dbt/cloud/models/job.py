from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\models\Job.java

from dataclasses import dataclass, field
from typing import Any

from integrations.dbt.cloud.models.job_schedule import JobSchedule
from integrations.dbt.cloud.models.job_settings import JobSettings
from integrations.dbt.cloud.models.job_triggers import JobTriggers


@dataclass(slots=True, kw_only=True)
class Job:
    execute_steps: list[str] = field(default_factory=list)
    id: int | None = None
    account_id: int | None = None
    project_id: int | None = None
    environment_id: int | None = None
    name: str | None = None
    dbt_version: str | None = None
    triggers: JobTriggers | None = None
    settings: JobSettings | None = None
    state: int | None = None
    generate_docs: bool | None = None
    schedule: JobSchedule | None = None
