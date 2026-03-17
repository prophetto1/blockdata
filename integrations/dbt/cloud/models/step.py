from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.dbt.cloud.models.job_status import JobStatus
from integrations.dbt.cloud.models.log_archive_type import LogArchiveType
from integrations.dbt.cloud.models.log_location import LogLocation


@dataclass(slots=True, kw_only=True)
class Step:
    id: int | None = None
    run_id: int | None = None
    account_id: int | None = None
    name: str | None = None
    logs: str | None = None
    debug_logs: str | None = None
    log_location: LogLocation | None = None
    log_path: str | None = None
    debug_log_path: str | None = None
    log_archive_type: LogArchiveType | None = None
    truncated_debug_logs: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    status_color: str | None = None
    status: JobStatus | None = None
    duration: str | None = None
    duration_humanized: str | None = None
