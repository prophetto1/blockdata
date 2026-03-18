from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\Trigger.java
# WARNING: Unresolved types: Exception, OnSerdeError

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from integrations.amqp.consume_interface import ConsumeInterface
from engine.core.models.executions.execution import Execution
from integrations.kafka.group_type import GroupType
from integrations.kafka.kafka_connection_interface import KafkaConnectionInterface
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.kafka.queue_acknowledge_type import QueueAcknowledgeType
from integrations.amqp.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Start a Flow on scheduled Kafka pulls"""
    group_id: Property[str]
    interval: timedelta = Duration.ofSeconds(60)
    serde_properties: Property[dict[str, str]] = Property.ofValue(new HashMap<>())
    group_type: Property[GroupType] = Property.ofValue(GroupType.CONSUMER)
    acknowledge_type: Property[QueueAcknowledgeType] = Property.ofValue(QueueAcknowledgeType.ACCEPT)
    key_deserializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    value_deserializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    poll_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    properties: Property[dict[str, str]] | None = None
    topic: Any | None = None
    partitions: Property[list[int]] | None = None
    topic_pattern: Property[str] | None = None
    on_serde_error: OnSerdeError | None = None
    since: Property[str] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    header_filters: Property[dict[str, str]] | None = None

    def consume_task(self) -> Consume:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
