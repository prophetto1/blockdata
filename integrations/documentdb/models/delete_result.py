from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-documentdb\src\main\java\io\kestra\plugin\documentdb\models\DeleteResult.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class DeleteResult:
    deleted_count: int | None = None
