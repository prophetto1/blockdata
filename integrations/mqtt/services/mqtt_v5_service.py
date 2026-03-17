from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mqtt\src\main\java\io\kestra\plugin\mqtt\services\MqttV5Service.java
# WARNING: Unresolved types: Consumer, Exception, MqttAsyncClient, Throwable

from dataclasses import dataclass
from typing import Any

from integrations.mqtt.abstract_mqtt_connection import AbstractMqttConnection
from integrations.amqp.models.message import Message
from integrations.mqtt.services.mqtt_interface import MqttInterface
from integrations.amqp.publish import Publish
from engine.core.runners.run_context import RunContext
from integrations.mqtt.subscribe import Subscribe


@dataclass(slots=True, kw_only=True)
class MqttV5Service:
    client: MqttAsyncClient | None = None
    crt: str | None = None

    def connect(self, run_context: RunContext, connection: AbstractMqttConnection) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def publish(self, run_context: RunContext, publish: Publish, message: list[int]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def subscribe(self, run_context: RunContext, subscribe: Subscribe, consumer: Consumer[Message]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def unsubscribe(self, run_context: RunContext, subscribe: Subscribe) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_disconnected(self, handler: Consumer[Throwable]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
