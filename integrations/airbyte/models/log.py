from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.webserver.models.events.event import Event


@dataclass(slots=True, kw_only=True)
class Log:
    log_lines: list[String] | None = None
    events: list[Event] | None = None
    version: str | None = None
