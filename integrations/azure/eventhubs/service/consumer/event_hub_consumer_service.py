from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\service\consumer\EventHubConsumerService.java
# WARNING: Unresolved types: Checkpoint, CheckpointStore, EventBatchContext, EventProcessorClientBuilder, Exception, Logger, PartitionContext

from dataclasses import dataclass
from typing import Any, Optional, Protocol

from integrations.azure.eventhubs.service.consumer.consumer_context import ConsumerContext
from integrations.azure.eventhubs.model.event_data_object import EventDataObject
from integrations.azure.eventhubs.client.event_hub_client_factory import EventHubClientFactory
from integrations.azure.eventhubs.config.event_hub_consumer_config import EventHubConsumerConfig
from integrations.azure.eventhubs.service.consumer.event_hub_name_partition import EventHubNamePartition
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException


@dataclass(slots=True, kw_only=True)
class EventHubConsumerService:
    client_factory: EventHubClientFactory | None = None
    config: EventHubConsumerConfig | None = None
    checkpoint_store: CheckpointStore | None = None

    def create_event_processor_client_builder(self, logger: Logger) -> EventProcessorClientBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def poll(self, consumer_context: ConsumerContext, listener: EventProcessorListener) -> dict[EventHubNamePartition, int]:
        raise NotImplementedError  # TODO: translate from Java

    def update_checkpoints(self, store: CheckpointStore, checkpoints: list[Checkpoint], logger: Logger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_checkpoint(self, context: EventBatchContext) -> Optional[Checkpoint]:
        raise NotImplementedError  # TODO: translate from Java

    class EventProcessorListener(Protocol):
        def on_event(self, event: EventDataObject, context: PartitionContext) -> None: ...

        def on_stop(self) -> None: ...
