from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mqtt\src\main\java\io\kestra\plugin\mqtt\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, CountDownLatch, Exception, Publisher, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.mqtt.abstract_mqtt_connection import AbstractMqttConnection
from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.amqp.models.message import Message
from integrations.mqtt.mqtt_properties_interface import MqttPropertiesInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.amqp.models.serde_type import SerdeType
from integrations.mqtt.subscribe import Subscribe
from integrations.mqtt.subscribe_interface import SubscribeInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput
from engine.core.utils.version import Version


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Trigger flow per MQTT message"""
    mqtt_version: Property[AbstractMqttConnection.Version] = Property.ofValue(AbstractMqttConnection.Version.V5)
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.JSON)
    qos: Property[int] = Property.ofValue(1)
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    server: Property[str] | None = None
    client_id: Property[str] | None = None
    connection_timeout: Property[timedelta] | None = None
    https_hostname_verification_enabled: Property[bool] | None = None
    auth_method: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    topic: Any | None = None
    crt: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def publisher(self, task: Subscribe, run_context: RunContext) -> Publisher[Message]:
        raise NotImplementedError  # TODO: translate from Java

    def busy_wait(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        id: int | None = None
        topic: str | None = None
        qos: int | None = None
        properties: list[int] | None = None
        payload: Any | None = None
        retain: bool | None = None
