from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\list\ListPopBaseInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property
from integrations.amqp.models.serde_type import SerdeType


class ListPopBaseInterface(Protocol):
    def get_key(self) -> Property[str]: ...

    def get_serde_type(self) -> Property[SerdeType]: ...
