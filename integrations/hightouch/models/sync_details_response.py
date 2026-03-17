from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hightouch\src\main\java\io\kestra\plugin\hightouch\models\SyncDetailsResponse.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.hightouch.models.run_status import RunStatus


@dataclass(slots=True, kw_only=True)
class SyncDetailsResponse:
    id: int | None = None
    slug: str | None = None
    workspace_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    destination_id: int | None = None
    model_id: int | None = None
    configuration: dict[str, Any] | None = None
    schedule: dict[str, Any] | None = None
    status: RunStatus | None = None
    disabled: bool | None = None
    last_run_at: datetime | None = None
    referenced_columns: list[str] | None = None
    primary_key: str | None = None
    external_segment: dict[str, Any] | None = None
