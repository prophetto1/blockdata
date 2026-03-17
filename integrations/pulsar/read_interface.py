from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\ReadInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property
from integrations.amqp.models.serde_type import SerdeType


class ReadInterface(Protocol):
    def get_topic(self) -> Any: ...

    def get_deserializer(self) -> Property[SerdeType]: ...
