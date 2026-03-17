from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mqtt\src\main\java\io\kestra\plugin\mqtt\MqttPropertiesInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property
from integrations.amqp.models.serde_type import SerdeType


class MqttPropertiesInterface(Protocol):
    def get_serde_type(self) -> Property[SerdeType]: ...

    def get_qos(self) -> Property[int]: ...
