from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\service\receiver\ReceiverContext.java

from dataclasses import dataclass
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class ReceiverContext:
    max_duration: timedelta | None = None
    max_messages: int | None = None
    message_selector: str | None = None
