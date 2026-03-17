from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property
from integrations.redis.models.serde_type import SerdeType


class MqttPropertiesInterface(Protocol):
    def get_serde_type(self) -> Property[SerdeType]: ...
    def get_qos(self) -> Property[int]: ...
