from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\Event.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Event:
    timestamp: int | None = None
    message: str | None = None
    level: str | None = None
    log_source: str | None = None
    caller: dict[str, Any] | None = None
