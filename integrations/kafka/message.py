from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class Message(io):
    key: Any | None = None
    value: Any | None = None
    topic: str | None = None
    headers: list[Pair[String, String]] | None = None
    partition: int | None = None
    timestamp: datetime | None = None
    offset: int | None = None
