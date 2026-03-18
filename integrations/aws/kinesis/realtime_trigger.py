from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\kinesis\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, ConcurrentHashMap, ConsumedRecord, CountDownLatch, Exception, FluxSink, IteratorType, KinesisAsyncClient, Publisher, ScheduledExecutorService

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.aws.kinesis.abstract_kinesis import AbstractKinesis
from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from engine.core.models.executions.execution import Execution
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.azure.eventhubs.service.consumer.starting_position import StartingPosition
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Trigger on Kinesis records (realtime)"""
    stream_name: Property[str]
    consumer_arn: Property[str]
    sts_role_session_duration: Property[timedelta] = Property.ofValue(AbstractConnectionInterface.AWS_MIN_STS_ROLE_SESSION_DURATION)
    iterator_type: Property[AbstractKinesis.IteratorType] = Property.ofValue(AbstractKinesis.IteratorType.LATEST)
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    shard_discovery_interval: Property[timedelta] = Property.ofValue(Duration.ofSeconds(30))
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    session_token: Property[str] | None = None
    region: Property[str] | None = None
    endpoint_override: Property[str] | None = None
    sts_role_arn: Property[str] | None = None
    sts_role_external_id: Property[str] | None = None
    sts_role_session_name: Property[str] | None = None
    sts_endpoint_override: Property[str] | None = None
    starting_sequence_number: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def create_flux(self, task: Consume, run_context: RunContext) -> Publisher[Consume.ConsumedRecord]:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ShardManager:
        scheduler: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
        subscribers: ConcurrentHashMap[str, ShardSubscriber] = new ConcurrentHashMap<>()
        client: KinesisAsyncClient | None = None
        sink: FluxSink[Consume.ConsumedRecord] | None = None
        run_context: RunContext | None = None
        stream: str | None = None
        consumer_arn: str | None = None
        rediscovery_interval: timedelta | None = None

        def start(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def stop(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def discover_shards(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def get_initial_starting_position(self, run_context: RunContext) -> StartingPosition:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ShardSubscriber:
        running: AtomicBoolean = new AtomicBoolean(false)
        client: KinesisAsyncClient | None = None
        sink: FluxSink[Consume.ConsumedRecord] | None = None
        run_context: RunContext | None = None
        stream: str | None = None
        consumer_arn: str | None = None
        shard_id: str | None = None
        last_seq: str | None = None
        starting_position: StartingPosition | None = None

        def start_subscription(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def stop(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def subscribe_once(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def resubscribe(self) -> None:
            raise NotImplementedError  # TODO: translate from Java
