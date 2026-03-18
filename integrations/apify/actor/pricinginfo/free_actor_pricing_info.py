from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\pricinginfo\FreeActorPricingInfo.java

from dataclasses import dataclass
from typing import Any

from integrations.apify.actor.pricinginfo.common_actor_pricing_info import CommonActorPricingInfo


@dataclass(slots=True, kw_only=True)
class FreeActorPricingInfo(CommonActorPricingInfo):
    pass
