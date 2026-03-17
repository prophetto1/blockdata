from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.airbyte.models.job_config_type import JobConfigType
from integrations.dbt.cloud.models.job_status import JobStatus
from integrations.airbyte.models.reset_config import ResetConfig


@dataclass(slots=True, kw_only=True)
class Job:
    id: int | None = None
    config_type: JobConfigType | None = None
    config_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    status: JobStatus | None = None
    reset_config: ResetConfig | None = None
