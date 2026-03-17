from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.airbyte.models.attempt_failure_summary import AttemptFailureSummary
from integrations.airbyte.models.attempt_stats import AttemptStats
from integrations.airbyte.models.attempt_status import AttemptStatus
from integrations.airbyte.models.attempt_stream_stats import AttemptStreamStats


@dataclass(slots=True, kw_only=True)
class Attempt:
    id: int | None = None
    status: AttemptStatus | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    ended_at: datetime | None = None
    bytes_synced: int | None = None
    records_synced: int | None = None
    total_stats: AttemptStats | None = None
    stream_stats: list[AttemptStreamStats] | None = None
    failure_summary: AttemptFailureSummary | None = None
