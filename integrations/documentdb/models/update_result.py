from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class UpdateResult:
    matched_count: int | None = None
    modified_count: int | None = None
    upserted_id: str | None = None
