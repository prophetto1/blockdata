from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mqtt\src\main\java\io\kestra\plugin\mqtt\AbstractMqttConnection.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from datetime import timedelta
from typing import Any

from integrations.mqtt.mqtt_connection_interface import MqttConnectionInterface
from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractMqttConnection(ABC, Task):
    mqtt_version: Property[Version] = Property.ofValue(Version.V5)
    server: Property[str] | None = None
    client_id: Property[str] | None = None
    connection_timeout: Property[timedelta] | None = None
    https_hostname_verification_enabled: Property[bool] | None = None
    auth_method: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    crt: Property[str] | None = None

    class Version(str, Enum):
        V3 = "V3"
        V5 = "V5"
