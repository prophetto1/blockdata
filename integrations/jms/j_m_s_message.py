from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jms\src\main\java\io\kestra\plugin\jms\JMSMessage.java
# WARNING: Unresolved types: AbstractDestination, AbstractJMSException, AbstractMessage, DestinationType, Exception

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.aws.glue.model.output import Output
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class JMSMessage:
    content_type: str | None = None
    content_encoding: str | None = None
    headers: dict[str, Any] | None = None
    delivery_mode: int | None = None
    priority: int | None = None
    message_id: str | None = None
    correlation_id: str | None = None
    reply_to: str | None = None
    reply_to_type: AbstractDestination.DestinationType | None = None
    expiration: timedelta | None = None
    timestamp: datetime | None = None
    type: str | None = None
    data: Any | None = None

    @staticmethod
    def of(msg: AbstractMessage, serde_type: SerdeType) -> JMSMessage:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_destination_name(destination: AbstractDestination) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_destination_type(destination: AbstractDestination) -> AbstractDestination.DestinationType:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_body_as_bytes(msg: AbstractMessage) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_string_property(msg: AbstractMessage, key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_properties(msg: AbstractMessage) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_expiration(msg: AbstractMessage) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java
