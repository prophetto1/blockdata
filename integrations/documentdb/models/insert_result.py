from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-documentdb\src\main\java\io\kestra\plugin\documentdb\models\InsertResult.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class InsertResult:
    inserted_ids: list[str] | None = None
    inserted_count: int | None = None
