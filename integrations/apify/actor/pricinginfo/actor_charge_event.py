from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\pricinginfo\ActorChargeEvent.java

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(slots=True, kw_only=True)
class ActorChargeEvent:
    event_price_usd: float | None = None
    event_title: str | None = None
    event_description: str | None = None

    def get_event_price_usd(self) -> Optional[float]:
        raise NotImplementedError  # TODO: translate from Java

    def get_event_description(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java
