from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.azure.eventhubs.abstract_event_hub_task import AbstractEventHubTask
from integrations.azure.eventhubs.model.event_data_object import EventDataObject
from integrations.azure.eventhubs.service.event_data_object_converter import EventDataObjectConverter
from integrations.azure.eventhubs.event_hub_batch_consumer_interface import EventHubBatchConsumerInterface
from integrations.azure.eventhubs.client.event_hub_client_factory import EventHubClientFactory
from integrations.azure.eventhubs.event_hub_consumer_interface import EventHubConsumerInterface
from integrations.azure.eventhubs.service.consumer.event_hub_consumer_service import EventHubConsumerService
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.solace.serde.serdes import Serdes
from integrations.azure.eventhubs.service.consumer.starting_position import StartingPosition


@dataclass(slots=True, kw_only=True)
class Consume(AbstractEventHubTask, EventHubConsumerInterface, EventHubBatchConsumerInterface, RunnableTask):
    """Consume events from Azure Event Hubs"""
    body_deserializer: Property[Serdes] | None = None
    body_deserializer_properties: Property[dict[String, Object]] | None = None
    consumer_group: Property[str] | None = None
    partition_starting_position: Property[StartingPosition] | None = None
    enqueue_time: Property[str] | None = None
    max_batch_size_per_partition: Property[int] | None = None
    max_wait_time_per_partition: Property[timedelta] | None = None
    max_duration: Property[timedelta] | None = None
    checkpoint_store_properties: Property[dict[String, String]]
    client_factory: EventHubClientFactory | None = None

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
    class Output(io):
        events_count: int | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    events_count: int | None = None
    uri: str | None = None
