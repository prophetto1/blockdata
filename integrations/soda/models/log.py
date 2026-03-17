from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-soda\src\main\java\io\kestra\plugin\soda\models\Log.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class Log:
    level: str | None = None
    message: str | None = None
    timestamp: datetime | None = None
    index: int | None = None
