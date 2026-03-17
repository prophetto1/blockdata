from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import timedelta

from integrations.mqtt.mqtt_connection_interface import MqttConnectionInterface
from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


class Version(str, Enum):
    V3 = "V3"
    V5 = "V5"


@dataclass(slots=True, kw_only=True)
class AbstractMqttConnection(Task, MqttConnectionInterface):
    mqtt_version: Property[Version]
    server: Property[str] | None = None
    client_id: Property[str] | None = None
    connection_timeout: Property[timedelta] | None = None
    https_hostname_verification_enabled: Property[bool] | None = None
    auth_method: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    crt: Property[str] | None = None
