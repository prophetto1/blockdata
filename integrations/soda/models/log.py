from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class Log:
    level: str | None = None
    message: str | None = None
    timestamp: datetime | None = None
    index: int | None = None
