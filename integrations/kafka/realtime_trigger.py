from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, AtomicReference, Consumer, ConsumerRecord, CountDownLatch, Exception, FluxSink, OnSerdeError, Publisher, ShareConsumer

from dataclasses import dataclass
from typing import Any, Protocol

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from engine.core.models.executions.execution import Execution
from integrations.kafka.group_type import GroupType
from integrations.kafka.kafka_connection_interface import KafkaConnectionInterface
from integrations.kafka.kafka_consumer_interface import KafkaConsumerInterface
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from integrations.kafka.queue_acknowledge_type import QueueAcknowledgeType
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.amqp.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Start a Flow for each Kafka record"""
    group_id: Property[str]
    serde_properties: Property[dict[str, str]] = Property.ofValue(new HashMap<>())
    group_type: Property[GroupType] = Property.ofValue(GroupType.CONSUMER)
    acknowledge_type: Property[QueueAcknowledgeType] = Property.ofValue(QueueAcknowledgeType.ACCEPT)
    key_deserializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    value_deserializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    consumer: AtomicReference[Consumer[Any, Any]] = new AtomicReference<>()
    share_consumer: AtomicReference[ShareConsumer[Any, Any]] = new AtomicReference<>()
    properties: Property[dict[str, str]] | None = None
    topic: Any | None = None
    partitions: Property[list[int]] | None = None
    topic_pattern: Property[str] | None = None
    on_serde_error: OnSerdeError | None = None
    since: Property[str] | None = None
    header_filters: Property[dict[str, str]] | None = None

    def consume_task(self) -> Consume:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def publisher(self, task: Consume, run_context: RunContext) -> Publisher[ConsumerRecord[Any, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def run_with_consumer(self, task: Consume, run_context: RunContext, flux_sink: FluxSink[ConsumerRecord[Any, Any]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run_with_share_consumer(self, task: Consume, run_context: RunContext, flux_sink: FluxSink[ConsumerRecord[Any, Any]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run_polling_loop(self, poll_action: PollAction) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    class PollAction(Protocol):
        def run(self) -> None: ...
