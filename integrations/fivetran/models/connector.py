from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.fivetran.models.connector_status_response import ConnectorStatusResponse
from integrations.fivetran.models.setup_test_result_response import SetupTestResultResponse


@dataclass(slots=True, kw_only=True)
class Connector:
    id: str | None = None
    name: str | None = None
    paused: bool | None = None
    version: int | None = None
    status: ConnectorStatusResponse | None = None
    daily_sync_time: str | None = None
    succeeded_at: datetime | None = None
    connector_type_id: str | None = None
    sync_frequency: int | None = None
    pause_after_trial: bool | None = None
    group_id: str | None = None
    connected_by: str | None = None
    setup_tests: list[SetupTestResultResponse] | None = None
    source_sync_details: Any | None = None
    created_at: datetime | None = None
    failed_at: datetime | None = None
    schedule_type: str | None = None
    properties: dict[String, Object] | None = None

    def get_properties(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def add_properties(self, property: str, value: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def completed_date(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java
