from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Data(io):
    size: int | None = None
    count: int | None = None
    value: Any | None = None
    uri: str | None = None
