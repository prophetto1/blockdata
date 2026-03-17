from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\HubspotResponse.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class HubspotResponse:
    id: int | None = None
    properties: dict[str, Any] | None = None
