from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\EventHubConsumerInterface.java

from typing import Any, Protocol

from integrations.azure.eventhubs.event_hub_client_interface import EventHubClientInterface
from engine.core.models.property.property import Property
from integrations.azure.eventhubs.serdes.serdes import Serdes
from integrations.azure.eventhubs.service.consumer.starting_position import StartingPosition


class EventHubConsumerInterface(EventHubClientInterface, Protocol):
    def get_body_deserializer(self) -> Property[Serdes]: ...

    def get_body_deserializer_properties(self) -> Property[dict[str, Any]]: ...

    def get_consumer_group(self) -> Property[str]: ...

    def get_partition_starting_position(self) -> Property[StartingPosition]: ...

    def get_enqueue_time(self) -> Property[str]: ...

    def get_checkpoint_store_properties(self) -> Property[dict[str, str]]: ...
