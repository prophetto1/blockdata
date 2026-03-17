from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kafka\src\main\java\io\kestra\plugin\kafka\Consume.java
# WARNING: Unresolved types: AtomicInteger, Consumer, ConsumerRecord, ConsumerRecords, Exception, Headers, KafkaConsumer, KafkaException, OnSerdeError, Pair, Pattern, ShareConsumer, TopicPartition, core, io, kestra, models, tasks

from dataclasses import dataclass
from pathlib import Path
from datetime import datetime
from datetime import timedelta
from typing import Any, Protocol

from integrations.kafka.abstract_kafka_connection import AbstractKafkaConnection
from integrations.amqp.consume_interface import ConsumeInterface
from integrations.kafka.group_type import GroupType
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from integrations.kafka.queue_acknowledge_type import QueueAcknowledgeType
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Consume(AbstractKafkaConnection):
    """Read Kafka records into internal storage"""
    group_type: Property[GroupType] = Property.ofValue(GroupType.CONSUMER)
    acknowledge_type: Property[QueueAcknowledgeType] = Property.ofValue(QueueAcknowledgeType.ACCEPT)
    key_deserializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    value_deserializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    poll_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    topic: Any | None = None
    topic_pattern: Property[str] | None = None
    partitions: Property[list[int]] | None = None
    group_id: Property[str] | None = None
    on_serde_error: OnSerdeError | None = None
    since: Property[str] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    subscription: ConsumerSubscription | None = None
    header_filters: Property[dict[str, str]] | None = None

    def consumer(self, run_context: RunContext) -> KafkaConsumer[Any, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def share_consumer(self, run_context: RunContext) -> ShareConsumer[Any, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_group_type(self, run_context: RunContext) -> GroupType:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_acknowledge_type(self, run_context: RunContext) -> QueueAcknowledgeType:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def run_with_consumer(self, run_context: RunContext, temp_file: Path) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def run_with_share_consumer(self, run_context: RunContext, temp_file: Path) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def handle_serde_error(self, run_context: RunContext, temp_file: Path, e: KafkaException) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def process_consumer_records(self, run_context: RunContext, records: ConsumerRecords[Any, Any], on_matching_record: RecordHandler) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def process_share_consumer_records(self, run_context: RunContext, consumer: ShareConsumer[Any, Any], records: ConsumerRecords[Any, Any], on_matching_record: RecordHandler) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def record_to_message(self, consumer_record: ConsumerRecord[Any, Any]) -> Message:
        raise NotImplementedError  # TODO: translate from Java

    def ended(self, run_context: RunContext, empty: bool, count: AtomicInteger, start: datetime) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def match_headers(self, headers: Headers, filters: dict[str, str]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def share_subscribe(self, run_context: RunContext, consumer: ShareConsumer[Any, Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def validate_share_configuration(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def topic_subscription(self, run_context: RunContext) -> ConsumerSubscription:
        raise NotImplementedError  # TODO: translate from Java

    def get_topic_partitions(self, run_context: RunContext) -> list[TopicPartition]:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate_topics(self, run_context: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate_since(self, run_context: RunContext) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def validate_configuration(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def process_headers(headers: Headers) -> list[Pair[str, str]]:
        raise NotImplementedError  # TODO: translate from Java

    class RecordHandler(Protocol):
        def accept(self, consumer_record: ConsumerRecord[Any, Any]) -> None: ...

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
        uri: str | None = None

    class ConsumerSubscription(Protocol):
        def subscribe(self, run_context: RunContext, consumer: Consumer[Any, Any], consume_interface: ConsumeInterface) -> None: ...

        def wait_for_subscription(self, run_context: RunContext, consumer: Consumer[Any, Any], consume_interface: ConsumeInterface) -> None: ...

    @dataclass(slots=True)
    class TopicPatternSubscription:
        group_id: str | None = None
        pattern: Pattern | None = None

        def subscribe(self, run_context: RunContext, consumer: Consumer[Any, Any], consume_interface: ConsumeInterface) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TopicListSubscription:
        group_id: str | None = None
        topics: list[str] | None = None

        def subscribe(self, run_context: RunContext, consumer: Consumer[Any, Any], consume_interface: ConsumeInterface) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TopicPartitionsSubscription:
        group_id: str | None = None
        topics: list[str] | None = None
        from_timestamp: int | None = None
        topic_partitions: list[TopicPartition] | None = None

        @staticmethod
        def for_topic_partitions(group_id: str, topic_partitions: list[TopicPartition], from_timestamp: int) -> TopicPartitionsSubscription:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def for_topics(group_id: str, topics: list[str], from_timestamp: int) -> TopicPartitionsSubscription:
            raise NotImplementedError  # TODO: translate from Java

        def subscribe(self, run_context: RunContext, consumer: Consumer[Any, Any], consume_interface: ConsumeInterface) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def topics(self) -> list[str]:
            raise NotImplementedError  # TODO: translate from Java

        def from_timestamp(self) -> int:
            raise NotImplementedError  # TODO: translate from Java

        def topic_partitions(self) -> list[TopicPartition]:
            raise NotImplementedError  # TODO: translate from Java

        def all_partitions_for_topics(self, consumer: Consumer[Any, Any], topics: list[str]) -> list[TopicPartition]:
            raise NotImplementedError  # TODO: translate from Java

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java
