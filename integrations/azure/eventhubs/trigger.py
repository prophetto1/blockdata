from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.solace.consume import Consume
from integrations.azure.eventhubs.event_hub_batch_consumer_interface import EventHubBatchConsumerInterface
from integrations.azure.eventhubs.event_hub_consumer_interface import EventHubConsumerInterface
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.solace.serde.serdes import Serdes
from integrations.azure.eventhubs.service.consumer.starting_position import StartingPosition
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, EventHubConsumerInterface, EventHubBatchConsumerInterface, PollingTriggerInterface, TriggerOutput):
    """Poll Azure Event Hubs and trigger flows"""
    interval: timedelta | None = None
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None
    sas_token: Property[str] | None = None
    client_max_retries: Property[int] | None = None
    client_retry_delay: Property[int] | None = None
    body_deserializer: Property[Serdes] | None = None
    body_deserializer_properties: Property[dict[String, Object]] | None = None
    consumer_group: Property[str] | None = None
    partition_starting_position: Property[StartingPosition] | None = None
    enqueue_time: Property[str] | None = None
    max_batch_size_per_partition: Property[int] | None = None
    max_wait_time_per_partition: Property[timedelta] | None = None
    max_duration: Property[timedelta] | None = None
    checkpoint_store_properties: Property[dict[String, String]]
    namespace: Property[str] | None = None
    event_hub_name: Property[str] | None = None
    custom_endpoint_address: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
