from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ModifiedRows:
    added_count: int | None = None
    changed_count: int | None = None
    removed_count: int | None = None
