from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Deal:
    id: int | None = None
    title: str | None = None
    value: BigDecimal | None = None
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
    acv: BigDecimal | None = None
    arr: BigDecimal | None = None
    mrr: BigDecimal | None = None
    close_time: str | None = None
    won_time: str | None = None
    lost_time: str | None = None
    lost_reason: str | None = None
    visible_to: str | None = None
    add_time: str | None = None
    update_time: str | None = None
    custom_fields: dict[String, Object] | None = None
