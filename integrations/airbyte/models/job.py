from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\Job.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.airbyte.models.job_config_type import JobConfigType
from integrations.airbyte.models.job_status import JobStatus
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
