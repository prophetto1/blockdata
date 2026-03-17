from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.solace.consume import Consume
from integrations.azure.eventhubs.model.event_data_output import EventDataOutput
from integrations.azure.eventhubs.event_hub_consumer_interface import EventHubConsumerInterface
from engine.core.models.executions.execution import Execution
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.solace.serde.serdes import Serdes
from integrations.azure.eventhubs.service.consumer.starting_position import StartingPosition
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger, EventHubConsumerInterface, RealtimeTriggerInterface, TriggerOutput):
    """Trigger flows from Azure Event Hubs in real time"""
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
    checkpoint_store_properties: Property[dict[String, String]] | None = None
    namespace: Property[str] | None = None
    event_hub_name: Property[str] | None = None
    custom_endpoint_address: Property[str] | None = None
    is_active: AtomicBoolean | None = None
    wait_for_termination: CountDownLatch | None = None

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
