from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class JobSchedule:
    cron: str | None = None
    date: str | None = None
    time: str | None = None
