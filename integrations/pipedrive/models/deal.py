from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pipedrive\src\main\java\io\kestra\plugin\pipedrive\models\Deal.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Deal:
    id: int | None = None
    title: str | None = None
    value: float | None = None
    currency: str | None = None
    user_id: int | None = None
    person_id: int | None = None
    org_id: int | None = None
    stage_id: int | None = None
    pipeline_id: int | None = None
    status: str | None = None
    probability: float | None = None
    expected_close_date: str | None = None
    local_won_date: str | None = None
    local_lost_date: str | None = None
    local_close_date: str | None = None
    origin: str | None = None
    origin_id: str | None = None
    channel: int | None = None
    channel_id: str | None = None
    acv: float | None = None
    arr: float | None = None
    mrr: float | None = None
    close_time: str | None = None
    won_time: str | None = None
    lost_time: str | None = None
    lost_reason: str | None = None
    visible_to: str | None = None
    add_time: str | None = None
    update_time: str | None = None
    custom_fields: dict[str, Any] | None = None
