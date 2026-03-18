from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\models\events\OssAuthEvent.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.webserver.models.events.event import Event


@dataclass(slots=True, kw_only=True)
class OssAuthEvent(Event):
    oss_auth: OssAuth | None = None

    @dataclass(slots=True)
    class OssAuth:
        email: str | None = None
