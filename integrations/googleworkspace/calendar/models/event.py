from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Event:
    id: str | None = None
    status: str | None = None
    summary: str | None = None
    description: str | None = None
    location: str | None = None

    def of(self, event: com) -> Event:
        raise NotImplementedError  # TODO: translate from Java
