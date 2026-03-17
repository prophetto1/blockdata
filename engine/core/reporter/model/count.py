from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\model\Count.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Count:
    count: int | None = None
