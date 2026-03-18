from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\ConsumeBaseInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property
from integrations.amqp.models.serde_type import SerdeType


class ConsumeBaseInterface(Protocol):
    def get_queue(self) -> Property[str]: ...

    def get_consumer_tag(self) -> Property[str]: ...

    def get_serde_type(self) -> Property[SerdeType]: ...
