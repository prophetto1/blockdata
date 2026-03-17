from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.mqtt.abstract_mqtt_connection import AbstractMqttConnection
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.nats.consume_interface import ConsumeInterface
from engine.core.models.executions.execution import Execution
from integrations.mqtt.mqtt_properties_interface import MqttPropertiesInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.redis.models.serde_type import SerdeType
from integrations.mqtt.subscribe import Subscribe
from integrations.nats.core.subscribe_interface import SubscribeInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, SubscribeInterface, ConsumeInterface, MqttPropertiesInterface):
    """Poll MQTT topics on a schedule"""
    interval: timedelta | None = None
    mqtt_version: Property[AbstractMqttConnection]
    server: Property[str] | None = None
    client_id: Property[str] | None = None
    connection_timeout: Property[timedelta] | None = None
    https_hostname_verification_enabled: Property[bool] | None = None
    auth_method: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    crt: Property[str] | None = None
    topic: Any | None = None
    serde_type: Property[SerdeType] | None = None
    qos: Property[int] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
