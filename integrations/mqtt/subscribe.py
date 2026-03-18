from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mqtt\src\main\java\io\kestra\plugin\mqtt\Subscribe.java
# WARNING: Unresolved types: AtomicInteger, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.mqtt.abstract_mqtt_connection import AbstractMqttConnection
from integrations.amqp.consume_interface import ConsumeInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.mqtt.mqtt_properties_interface import MqttPropertiesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType
from integrations.mqtt.subscribe_interface import SubscribeInterface


@dataclass(slots=True, kw_only=True)
class Subscribe(AbstractMqttConnection):
    """Subscribe and buffer MQTT messages"""
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.JSON)
    qos: Property[int] = Property.ofValue(1)
    topic: Any | None = None
    crt: Property[str] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def topics(self, run_context: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def ended(self, count: AtomicInteger, start: datetime, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
        uri: str | None = None
