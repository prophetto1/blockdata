from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.mqtt.abstract_mqtt_connection import AbstractMqttConnection
from engine.core.models.property.data import Data
from integrations.mqtt.mqtt_properties_interface import MqttPropertiesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Publish(AbstractMqttConnection, RunnableTask, MqttPropertiesInterface, Data):
    """Publish messages to MQTT topics"""
    topic: Property[str]
    from: Any
    retain: Property[bool]
    serde_type: Property[SerdeType] | None = None
    qos: Property[int] | None = None

    def run(self, run_context: RunContext) -> Publish:
        raise NotImplementedError  # TODO: translate from Java

    def serialize(self, row: Any, run_context: RunContext) -> byte:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        messages_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    messages_count: int | None = None
