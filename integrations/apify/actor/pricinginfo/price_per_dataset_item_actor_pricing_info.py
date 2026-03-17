from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\pricinginfo\PricePerDatasetItemActorPricingInfo.java

from dataclasses import dataclass
from typing import Any, Optional

from integrations.apify.actor.pricinginfo.common_actor_pricing_info import CommonActorPricingInfo


@dataclass(slots=True, kw_only=True)
class PricePerDatasetItemActorPricingInfo(CommonActorPricingInfo):
    unit_name: str | None = None
    price_per_unit_usd: float | None = None

    def get_unit_name(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java
