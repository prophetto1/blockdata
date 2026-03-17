from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

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
    configuration: dict[String, Object] | None = None
    schedule: dict[String, Object] | None = None
    status: RunStatus | None = None
    disabled: bool | None = None
    last_run_at: datetime | None = None
    referenced_columns: list[String] | None = None
    primary_key: str | None = None
    external_segment: dict[String, Object] | None = None
