from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Message:
    id: int | None = None
    topic: str | None = None
    qos: int | None = None
    properties: list[Byte] | None = None
    payload: Any | None = None
    retain: bool | None = None
