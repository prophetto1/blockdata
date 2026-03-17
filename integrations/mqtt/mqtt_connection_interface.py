from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mqtt\src\main\java\io\kestra\plugin\mqtt\MqttConnectionInterface.java

from datetime import timedelta
from typing import Any, Protocol

from integrations.mqtt.abstract_mqtt_connection import AbstractMqttConnection
from engine.core.models.property.property import Property
from engine.core.utils.version import Version


class MqttConnectionInterface(Protocol):
    def get_server(self) -> Property[str]: ...

    def get_mqtt_version(self) -> Property[AbstractMqttConnection.Version]: ...

    def get_client_id(self) -> Property[str]: ...

    def get_connection_timeout(self) -> Property[timedelta]: ...

    def get_https_hostname_verification_enabled(self) -> Property[bool]: ...

    def get_auth_method(self) -> Property[str]: ...

    def get_username(self) -> Property[str]: ...

    def get_password(self) -> Property[str]: ...

    def get_crt(self) -> Property[str]: ...
