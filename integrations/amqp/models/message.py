from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Message(io):
    content_type: str | None = None
    content_encoding: str | None = None
    headers: dict[String, Object] | None = None
    delivery_mode: int | None = None
    priority: int | None = None
    message_id: str | None = None
    correlation_id: str | None = None
    reply_to: str | None = None
    expiration: timedelta | None = None
    timestamp: datetime | None = None
    type: str | None = None
    user_id: str | None = None
    app_id: str | None = None
    data: Any | None = None

    def of(self, message: byte, serde_type: SerdeType, properties: BasicProperties) -> Message:
        raise NotImplementedError  # TODO: translate from Java
