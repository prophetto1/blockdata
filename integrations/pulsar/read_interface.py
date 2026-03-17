from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property
from integrations.redis.models.serde_type import SerdeType


class ReadInterface(Protocol):
    def get_topic(self) -> Any: ...
    def get_deserializer(self) -> Property[SerdeType]: ...
