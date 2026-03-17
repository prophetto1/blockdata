from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mqtt\src\main\java\io\kestra\plugin\mqtt\Publish.java
# WARNING: Unresolved types: Exception, From, JsonProcessingException, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.mqtt.abstract_mqtt_connection import AbstractMqttConnection
from integrations.datagen.data import Data
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.mqtt.mqtt_properties_interface import MqttPropertiesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Publish(AbstractMqttConnection):
    """Publish messages to MQTT topics"""
    topic: Property[str]
    from: Any
    retain: Property[bool] = Property.ofValue(false)
    qos: Property[int] = Property.ofValue(1)
    serde_type: Property[SerdeType] | None = None

    def run(self, run_context: RunContext) -> Publish.Output:
        raise NotImplementedError  # TODO: translate from Java

    def serialize(self, row: Any, run_context: RunContext) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
