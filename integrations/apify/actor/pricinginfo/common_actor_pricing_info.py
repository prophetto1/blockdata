from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\pricinginfo\CommonActorPricingInfo.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

from integrations.apify.actor.pricinginfo.flat_price_per_month_actor_pricing_info import FlatPricePerMonthActorPricingInfo
from integrations.apify.actor.pricinginfo.free_actor_pricing_info import FreeActorPricingInfo
from integrations.apify.actor.pricinginfo.price_per_dataset_item_actor_pricing_info import PricePerDatasetItemActorPricingInfo
from integrations.apify.actor.pricinginfo.price_per_event_actor_pricing_info import PricePerEventActorPricingInfo


@dataclass(slots=True, kw_only=True)
class CommonActorPricingInfo(ABC):
    pricing_model: str | None = None
    apify_margin_percentage: float | None = None
    created_at: str | None = None
    started_at: str | None = None
    notified_about_future_change_at: str | None = None
    notified_about_change_at: str | None = None
    reason_for_change: str | None = None

    def get_apify_margin_percentage(self) -> Optional[float]:
        raise NotImplementedError  # TODO: translate from Java

    def get_notified_about_future_change_at(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_notified_about_change_at(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_reason_for_change(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java
