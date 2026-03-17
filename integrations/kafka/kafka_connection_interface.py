from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class KafkaConnectionInterface(Protocol):
    def get_properties(self) -> Property[dict[String, String]]: ...
    def get_serde_properties(self) -> Property[dict[String, String]]: ...
