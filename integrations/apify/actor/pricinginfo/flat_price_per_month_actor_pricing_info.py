from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\pricinginfo\FlatPricePerMonthActorPricingInfo.java

from dataclasses import dataclass
from typing import Any, Optional

from integrations.apify.actor.pricinginfo.common_actor_pricing_info import CommonActorPricingInfo


@dataclass(slots=True, kw_only=True)
class FlatPricePerMonthActorPricingInfo(CommonActorPricingInfo):
    trial_minutes: float | None = None
    price_per_unit_usd: float | None = None

    def get_trial_minutes(self) -> Optional[float]:
        raise NotImplementedError  # TODO: translate from Java
