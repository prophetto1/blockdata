from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class JMSDestination:
    destination_name: str
    destination_type: AbstractDestination = AbstractDestination.DestinationType.QUEUE
