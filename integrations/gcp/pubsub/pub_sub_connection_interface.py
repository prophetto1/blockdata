from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\pubsub\PubSubConnectionInterface.java

from typing import Any, Protocol

from integrations.gcp.gcp_interface import GcpInterface
from engine.core.models.property.property import Property


class PubSubConnectionInterface(GcpInterface, Protocol):
    def get_topic(self) -> Property[str]: ...
