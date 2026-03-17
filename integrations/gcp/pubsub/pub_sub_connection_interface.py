from __future__ import annotations

from typing import Any, Protocol

from integrations.googleworkspace.gcp_interface import GcpInterface
from engine.core.models.property.property import Property


class PubSubConnectionInterface(GcpInterface):
    def get_topic(self) -> Property[str]: ...
