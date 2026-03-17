from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.airbyte.models.attempt_info import AttemptInfo
from integrations.dbt.cloud.models.job import Job


@dataclass(slots=True, kw_only=True)
class JobInfo:
    job: Job | None = None
    attempts: list[AttemptInfo] | None = None
