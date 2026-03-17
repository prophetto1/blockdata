from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\KafkaConsumerInterface.java

from dataclasses import dataclass
from enum import Enum
from typing import Any, Protocol

from integrations.kafka.group_type import GroupType
from engine.core.models.property.property import Property
from integrations.kafka.queue_acknowledge_type import QueueAcknowledgeType
from integrations.amqp.models.serde_type import SerdeType


class KafkaConsumerInterface(Protocol):
    def get_topic(self) -> Any: ...

    def get_topic_pattern(self) -> Property[str]: ...

    def get_partitions(self) -> Property[list[int]]: ...

    def get_group_id(self) -> Property[str]: ...

    def get_group_type(self) -> Property[GroupType]: ...

    def get_acknowledge_type(self) -> Property[QueueAcknowledgeType]: ...

    def get_key_deserializer(self) -> Property[SerdeType]: ...

    def get_value_deserializer(self) -> Property[SerdeType]: ...

    def get_since(self) -> Property[str]: ...

    def get_on_serde_error(self) -> OnSerdeError: ...
