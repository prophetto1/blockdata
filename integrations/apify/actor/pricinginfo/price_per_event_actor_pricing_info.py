from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.apify.actor.pricinginfo.common_actor_pricing_info import CommonActorPricingInfo
from integrations.apify.actor.pricinginfo.pricing_per_event import PricingPerEvent


@dataclass(slots=True, kw_only=True)
class PricePerEventActorPricingInfo(CommonActorPricingInfo):
    pricing_per_event: PricingPerEvent | None = None
    minimal_max_total_charge_usd: float | None = None

    def get_minimal_max_total_charge_usd(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java
