from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol

from integrations.kafka.group_type import GroupType
from engine.core.models.property.property import Property
from integrations.kafka.queue_acknowledge_type import QueueAcknowledgeType
from integrations.redis.models.serde_type import SerdeType


class OnSerdeErrorBehavior(str, Enum):
    SKIPPED = "SKIPPED"
    DLQ = "DLQ"
    STORE = "STORE"


class KafkaConsumerInterface(Protocol):
    def get_topic(self) -> Any: ...
    def get_topic_pattern(self) -> Property[str]: ...
    def get_partitions(self) -> Property[list[Integer]]: ...
    def get_group_id(self) -> Property[str]: ...
    def get_group_type(self) -> Property[GroupType]: ...
    def get_acknowledge_type(self) -> Property[QueueAcknowledgeType]: ...
    def get_key_deserializer(self) -> Property[SerdeType]: ...
    def get_value_deserializer(self) -> Property[SerdeType]: ...
    def get_since(self) -> Property[str]: ...
    def get_on_serde_error(self) -> OnSerdeError: ...


@dataclass(slots=True, kw_only=True)
class OnSerdeError:
    type: Property[OnSerdeErrorBehavior]
    topic: Property[str] | None = None
