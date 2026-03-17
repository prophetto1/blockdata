from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.fivetran.models.alert import Alert


@dataclass(slots=True, kw_only=True)
class ConnectorStatusResponse:
    tasks: list[Alert] | None = None
    warnings: list[Alert] | None = None
    schema_status: str | None = None
    update_state: str | None = None
    setup_state: str | None = None
    sync_state: str | None = None
    is_historical_sync: bool | None = None
