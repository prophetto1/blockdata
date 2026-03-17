from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class InsertResult:
    inserted_ids: list[String] | None = None
    inserted_count: int | None = None
