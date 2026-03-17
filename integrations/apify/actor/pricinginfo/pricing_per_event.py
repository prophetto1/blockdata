from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\pricinginfo\PricingPerEvent.java

from dataclasses import dataclass
from typing import Any

from integrations.apify.actor.pricinginfo.actor_charge_event import ActorChargeEvent


@dataclass(slots=True, kw_only=True)
class PricingPerEvent:
    actor_charge_events: dict[str, ActorChargeEvent] | None = None
