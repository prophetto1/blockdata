from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\config\EventHubConsumerConfig.java
# WARNING: Unresolved types: EventPosition

from dataclasses import dataclass
from typing import Any

from integrations.azure.eventhubs.config.event_hub_client_config import EventHubClientConfig
from integrations.azure.eventhubs.event_hub_consumer_interface import EventHubConsumerInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class EventHubConsumerConfig(EventHubClientConfig):

    def consumer_group(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def partition_starting_position(self) -> EventPosition:
        raise NotImplementedError  # TODO: translate from Java
