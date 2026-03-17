from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\KafkaConnectionInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class KafkaConnectionInterface(Protocol):
    def get_properties(self) -> Property[dict[str, str]]: ...

    def get_serde_properties(self) -> Property[dict[str, str]]: ...
