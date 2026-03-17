from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Event:
    timestamp: int | None = None
    message: str | None = None
    level: str | None = None
    log_source: str | None = None
    caller: dict[String, Object] | None = None
