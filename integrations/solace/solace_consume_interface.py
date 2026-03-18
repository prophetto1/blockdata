from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\SolaceConsumeInterface.java

from datetime import timedelta
from typing import Any, Protocol

from engine.core.models.property.property import Property
from integrations.solace.service.receiver.queue_types import QueueTypes
from integrations.azure.eventhubs.serdes.serdes import Serdes
from integrations.solace.solace_connection_interface import SolaceConnectionInterface


class SolaceConsumeInterface(SolaceConnectionInterface, Protocol):
    def get_queue_name(self) -> Property[str]: ...

    def get_queue_type(self) -> Property[QueueTypes]: ...

    def get_message_deserializer(self) -> Property[Serdes]: ...

    def get_message_deserializer_properties(self) -> Property[dict[str, Any]]: ...

    def get_max_messages(self) -> Property[int]: ...

    def get_max_duration(self) -> Property[timedelta]: ...

    def get_message_selector(self) -> Property[str]: ...
