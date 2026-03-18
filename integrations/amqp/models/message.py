from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\models\Message.java
# WARNING: Unresolved types: BasicProperties, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.aws.glue.model.output import Output
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Message:
    content_type: str | None = None
    content_encoding: str | None = None
    headers: dict[str, Any] | None = None
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

    @staticmethod
    def of(message: list[int], serde_type: SerdeType, properties: BasicProperties) -> Message:
        raise NotImplementedError  # TODO: translate from Java
