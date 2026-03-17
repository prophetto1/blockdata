from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.apify.actor.pricinginfo.common_actor_pricing_info import CommonActorPricingInfo


@dataclass(slots=True, kw_only=True)
class PricePerDatasetItemActorPricingInfo(CommonActorPricingInfo):
    unit_name: str | None = None
    price_per_unit_usd: float | None = None

    def get_unit_name(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java
