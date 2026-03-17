from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.eventhubs.config.event_hub_client_config import EventHubClientConfig
from integrations.azure.eventhubs.event_hub_consumer_interface import EventHubConsumerInterface


@dataclass(slots=True, kw_only=True)
class EventHubConsumerConfig(EventHubClientConfig):

    def consumer_group(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def partition_starting_position(self) -> EventPosition:
        raise NotImplementedError  # TODO: translate from Java
