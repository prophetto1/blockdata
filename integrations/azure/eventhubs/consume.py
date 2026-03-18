from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\Consume.java
# WARNING: Unresolved types: CheckpointStore, Exception, T, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.azure.eventhubs.abstract_event_hub_task import AbstractEventHubTask
from integrations.azure.eventhubs.service.event_data_object_converter import EventDataObjectConverter
from integrations.azure.eventhubs.event_hub_batch_consumer_interface import EventHubBatchConsumerInterface
from integrations.azure.eventhubs.client.event_hub_client_factory import EventHubClientFactory
from integrations.azure.eventhubs.event_hub_consumer_interface import EventHubConsumerInterface
from integrations.azure.eventhubs.service.consumer.event_hub_consumer_service import EventHubConsumerService
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.eventhubs.serdes.serdes import Serdes
from integrations.azure.eventhubs.service.consumer.starting_position import StartingPosition


@dataclass(slots=True, kw_only=True)
class Consume(AbstractEventHubTask):
    """Consume events from Azure Event Hubs"""
    checkpoint_store_properties: Property[dict[str, str]]
    body_deserializer: Property[Serdes] = Property.ofValue(Serdes.STRING)
    body_deserializer_properties: Property[dict[str, Any]] = Property.ofValue(new HashMap<>())
    consumer_group: Property[str] = Property.ofValue("$Default")
    partition_starting_position: Property[StartingPosition] = Property.ofValue(StartingPosition.EARLIEST)
    max_batch_size_per_partition: Property[int] = Property.ofValue(50)
    max_wait_time_per_partition: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(10))
    client_factory: EventHubClientFactory = new EventHubClientFactory()
    enqueue_time: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext, task: T) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def new_converter(self, task: EventHubConsumerInterface, run_context: RunContext) -> EventDataObjectConverter:
        raise NotImplementedError  # TODO: translate from Java

    def new_event_hub_consumer_service(self, run_context: RunContext, task: EventHubConsumerInterface) -> EventHubConsumerService:
        raise NotImplementedError  # TODO: translate from Java

    def get_blob_checkpoint_store(self, run_context: RunContext, plugin_config: EventHubConsumerInterface, factory: EventHubClientFactory) -> CheckpointStore:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        events_count: int | None = None
        uri: str | None = None
