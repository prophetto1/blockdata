from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, CountDownLatch, Exception, Publisher

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from integrations.azure.eventhubs.model.event_data_output import EventDataOutput
from integrations.azure.eventhubs.event_hub_consumer_interface import EventHubConsumerInterface
from engine.core.models.executions.execution import Execution
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.azure.eventhubs.serdes.serdes import Serdes
from integrations.azure.eventhubs.service.consumer.starting_position import StartingPosition
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Trigger flows from Azure Event Hubs in real time"""
    client_max_retries: Property[int] = Property.ofValue(5)
    client_retry_delay: Property[int] = Property.ofValue(500L)
    body_deserializer: Property[Serdes] = Property.ofValue(Serdes.STRING)
    body_deserializer_properties: Property[dict[str, Any]] = Property.ofValue(new HashMap<>())
    consumer_group: Property[str] = Property.ofValue("$Default")
    partition_starting_position: Property[StartingPosition] = Property.ofValue(StartingPosition.EARLIEST)
    checkpoint_store_properties: Property[dict[str, str]] = Property.ofValue(new HashMap<>())
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None
    sas_token: Property[str] | None = None
    enqueue_time: Property[str] | None = None
    namespace: Property[str] | None = None
    event_hub_name: Property[str] | None = None
    custom_endpoint_address: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def publisher(self, task: Consume, run_context: RunContext) -> Publisher[EventDataOutput]:
        raise NotImplementedError  # TODO: translate from Java

    def busy_wait(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
