from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.mqtt.abstract_mqtt_connection import AbstractMqttConnection
from integrations.mqtt.services.mqtt_interface import MqttInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class MqttFactory:

    def create(self, run_context: RunContext, connection: AbstractMqttConnection) -> MqttInterface:
        raise NotImplementedError  # TODO: translate from Java
