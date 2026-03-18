from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\Trigger.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from integrations.azure.eventhubs.event_hub_batch_consumer_interface import EventHubBatchConsumerInterface
from integrations.azure.eventhubs.event_hub_consumer_interface import EventHubConsumerInterface
from engine.core.models.executions.execution import Execution
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.azure.eventhubs.serdes.serdes import Serdes
from integrations.azure.eventhubs.service.consumer.starting_position import StartingPosition
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Poll Azure Event Hubs and trigger flows"""
    checkpoint_store_properties: Property[dict[str, str]]
    interval: timedelta = Duration.ofSeconds(60)
    client_max_retries: Property[int] = Property.ofValue(5)
    client_retry_delay: Property[int] = Property.ofValue(500L)
    body_deserializer: Property[Serdes] = Property.ofValue(Serdes.STRING)
    body_deserializer_properties: Property[dict[str, Any]] = Property.ofValue(new HashMap<>())
    consumer_group: Property[str] = Property.ofValue("$Default")
    partition_starting_position: Property[StartingPosition] = Property.ofValue(StartingPosition.EARLIEST)
    max_batch_size_per_partition: Property[int] = Property.ofValue(50)
    max_wait_time_per_partition: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(10))
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None
    sas_token: Property[str] | None = None
    enqueue_time: Property[str] | None = None
    namespace: Property[str] | None = None
    event_hub_name: Property[str] | None = None
    custom_endpoint_address: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
