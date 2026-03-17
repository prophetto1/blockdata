from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta


@dataclass(slots=True, kw_only=True)
class Message(io):
    message_id: str | None = None
    subject: str | None = None
    body: Any | None = None
    time_to_live: timedelta | None = None
    application_properties: dict[String, Object] | None = None
