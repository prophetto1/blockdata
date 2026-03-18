from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hightouch\src\main\java\io\kestra\plugin\hightouch\models\ModifiedRows.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ModifiedRows:
    added_count: int | None = None
    changed_count: int | None = None
    removed_count: int | None = None
