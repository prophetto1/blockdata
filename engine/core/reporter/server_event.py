from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\ServerEvent.java
# WARNING: Unresolved types: ZoneId

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.server_type import ServerType


@dataclass(slots=True, kw_only=True)
class ServerEvent:
    instance_uuid: str | None = None
    session_uuid: str | None = None
    server_type: ServerType | None = None
    server_version: str | None = None
    zone_id: ZoneId | None = None
    payload: Any | None = None
    uuid: str | None = None
    reported_at: datetime | None = None

    def payload(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java
