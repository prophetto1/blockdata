from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\logs\LogRecord.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class LogRecord:
    resource: str | None = None
    timestamp_epoch_nanos: int | None = None
    severity: str | None = None
    attributes: dict[str, Any] | None = None
    body_value: str | None = None
