from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class TimestampService:

    def of(self, timestamp: Timestamp) -> datetime:
        raise NotImplementedError  # TODO: translate from Java
