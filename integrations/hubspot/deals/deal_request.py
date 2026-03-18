from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\deals\DealRequest.java

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class DealRequest:
    properties: dict[str, Any] = field(default_factory=dict)
    associations: list[DealAssociation] = field(default_factory=list)

    @dataclass(slots=True)
    class DealAssociation:
        to: str | None = None
        id: int | None = None
