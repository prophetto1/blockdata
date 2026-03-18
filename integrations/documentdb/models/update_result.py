from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-documentdb\src\main\java\io\kestra\plugin\documentdb\models\UpdateResult.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class UpdateResult:
    matched_count: int | None = None
    modified_count: int | None = None
    upserted_id: str | None = None
