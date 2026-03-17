from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mqtt\src\main\java\io\kestra\plugin\mqtt\services\MqttFactory.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.mqtt.abstract_mqtt_connection import AbstractMqttConnection
from integrations.mqtt.services.mqtt_interface import MqttInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class MqttFactory(ABC):

    @staticmethod
    def create(run_context: RunContext, connection: AbstractMqttConnection) -> MqttInterface:
        raise NotImplementedError  # TODO: translate from Java
