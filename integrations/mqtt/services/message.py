from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mqtt\src\main\java\io\kestra\plugin\mqtt\services\Message.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Message:
    id: int | None = None
    topic: str | None = None
    qos: int | None = None
    properties: list[int] | None = None
    payload: Any | None = None
    retain: bool | None = None
