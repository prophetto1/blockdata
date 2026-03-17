from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\service\producer\ProducerContext.java
# WARNING: Unresolved types: Logger

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ProducerContext:
    body_content_type: str | None = None
    event_properties: dict[str, str] | None = None
    max_events_per_batch: int | None = None
    logger: Logger | None = None
