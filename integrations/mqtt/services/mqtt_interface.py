from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mqtt\src\main\java\io\kestra\plugin\mqtt\services\MqttInterface.java
# WARNING: Unresolved types: Consumer, Exception, Throwable

from typing import Any, Protocol

from integrations.mqtt.abstract_mqtt_connection import AbstractMqttConnection
from integrations.amqp.models.message import Message
from integrations.amqp.publish import Publish
from engine.core.runners.run_context import RunContext
from integrations.mqtt.subscribe import Subscribe
from engine.core.utils.version import Version


class MqttInterface(Protocol):
    def connect(self, run_context: RunContext, connection: AbstractMqttConnection) -> None: ...

    def publish(self, run_context: RunContext, publish: Publish, message: list[int]) -> None: ...

    def subscribe(self, run_context: RunContext, subscribe: Subscribe, consumer: Consumer[Message]) -> None: ...

    def unsubscribe(self, run_context: RunContext, subscribe: Subscribe) -> None: ...

    def close(self) -> None: ...

    def on_disconnected(self, handler: Consumer[Throwable]) -> None: ...

    def create(self, version: AbstractMqttConnection.Version) -> MqttInterface: ...
