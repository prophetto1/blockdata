from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class HubspotResponse:
    id: int | None = None
    properties: dict[String, Object] | None = None
