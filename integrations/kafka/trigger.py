from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.solace.consume import Consume
from integrations.nats.consume_interface import ConsumeInterface
from engine.core.models.executions.execution import Execution
from integrations.kafka.group_type import GroupType
from integrations.kafka.kafka_connection_interface import KafkaConnectionInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.kafka.queue_acknowledge_type import QueueAcknowledgeType
from integrations.redis.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, KafkaConnectionInterface, ConsumeInterface):
    """Start a Flow on scheduled Kafka pulls"""
    interval: timedelta | None = None
    properties: Property[dict[String, String]] | None = None
    serde_properties: Property[dict[String, String]] | None = None
    topic: Any | None = None
    partitions: Property[list[Integer]] | None = None
    topic_pattern: Property[str] | None = None
    group_id: Property[str]
    group_type: Property[GroupType] | None = None
    acknowledge_type: Property[QueueAcknowledgeType] | None = None
    key_deserializer: Property[SerdeType] | None = None
    value_deserializer: Property[SerdeType] | None = None
    on_serde_error: OnSerdeError | None = None
    since: Property[str] | None = None
    poll_duration: Property[timedelta] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    header_filters: Property[dict[String, String]] | None = None

    def consume_task(self) -> Consume:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
