from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hightouch\src\main\java\io\kestra\plugin\hightouch\models\RunDetails.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.hightouch.models.modified_rows import ModifiedRows
from integrations.hightouch.models.run_status import RunStatus


@dataclass(slots=True, kw_only=True)
class RunDetails:
    id: int | None = None
    planned_rows: ModifiedRows | None = None
    successful_rows: ModifiedRows | None = None
    failed_rows: ModifiedRows | None = None
    query_size: int | None = None
    status: RunStatus | None = None
    created_at: datetime | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    completion_ratio: int | None = None
    error: str | None = None
