from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class MessageOutput:
    id: str | None = None
    text: str | None = None
    severity: int | None = None
