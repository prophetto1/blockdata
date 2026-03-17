from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class CommonActorPricingInfo:
    pricing_model: str | None = None
    apify_margin_percentage: float | None = None
    created_at: str | None = None
    started_at: str | None = None
    notified_about_future_change_at: str | None = None
    notified_about_change_at: str | None = None
    reason_for_change: str | None = None

    def get_apify_margin_percentage(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_notified_about_future_change_at(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def get_notified_about_change_at(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def get_reason_for_change(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java
