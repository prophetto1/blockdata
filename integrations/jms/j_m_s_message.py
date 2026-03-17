from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from engine.core.models.tasks.output import Output
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class JMSMessage(Output):
    content_type: str | None = None
    content_encoding: str | None = None
    headers: dict[String, Object] | None = None
    delivery_mode: int | None = None
    priority: int | None = None
    message_id: str | None = None
    correlation_id: str | None = None
    reply_to: str | None = None
    reply_to_type: AbstractDestination | None = None
    expiration: timedelta | None = None
    timestamp: datetime | None = None
    type: str | None = None
    data: Any | None = None

    def of(self, msg: AbstractMessage, serde_type: SerdeType) -> JMSMessage:
        raise NotImplementedError  # TODO: translate from Java

    def get_destination_name(self, destination: AbstractDestination) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_destination_type(self, destination: AbstractDestination) -> AbstractDestination:
        raise NotImplementedError  # TODO: translate from Java

    def get_body_as_bytes(self, msg: AbstractMessage) -> byte:
        raise NotImplementedError  # TODO: translate from Java

    def get_string_property(self, msg: AbstractMessage, key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def extract_properties(self, msg: AbstractMessage) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def get_expiration(self, msg: AbstractMessage) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java
