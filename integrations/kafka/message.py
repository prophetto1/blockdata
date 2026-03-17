from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\Message.java
# WARNING: Unresolved types: Pair, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.aws.glue.model.output import Output


@dataclass(slots=True, kw_only=True)
class Message:
    key: Any | None = None
    value: Any | None = None
    topic: str | None = None
    headers: list[Pair[str, str]] | None = None
    partition: int | None = None
    timestamp: datetime | None = None
    offset: int | None = None
