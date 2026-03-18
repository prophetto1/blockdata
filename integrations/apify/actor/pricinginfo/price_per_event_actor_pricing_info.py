from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\pricinginfo\PricePerEventActorPricingInfo.java

from dataclasses import dataclass
from typing import Any, Optional

from integrations.apify.actor.pricinginfo.common_actor_pricing_info import CommonActorPricingInfo
from integrations.apify.actor.pricinginfo.pricing_per_event import PricingPerEvent


@dataclass(slots=True, kw_only=True)
class PricePerEventActorPricingInfo(CommonActorPricingInfo):
    pricing_per_event: PricingPerEvent | None = None
    minimal_max_total_charge_usd: float | None = None

    def get_minimal_max_total_charge_usd(self) -> Optional[float]:
        raise NotImplementedError  # TODO: translate from Java
