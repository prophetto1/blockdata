from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.apify.actor.pricinginfo.actor_charge_event import ActorChargeEvent


@dataclass(slots=True, kw_only=True)
class PricingPerEvent:
    actor_charge_events: dict[String, ActorChargeEvent] | None = None
