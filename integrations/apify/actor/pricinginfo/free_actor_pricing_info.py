from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.apify.actor.pricinginfo.common_actor_pricing_info import CommonActorPricingInfo


@dataclass(slots=True, kw_only=True)
class FreeActorPricingInfo(CommonActorPricingInfo):
    pass
