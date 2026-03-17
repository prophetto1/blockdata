from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\Log.java

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.models.event import Event


@dataclass(slots=True, kw_only=True)
class Log:
    log_lines: list[str] | None = None
    events: list[Event] | None = None
    version: str | None = None
