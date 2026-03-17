from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Pool:
    id: str
    target_dedicated_nodes: int | None = None
    target_low_priority_nodes: int | None = None
