from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ActorChargeEvent:
    event_price_usd: float | None = None
    event_title: str | None = None
    event_description: str | None = None

    def get_event_price_usd(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_event_description(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java
