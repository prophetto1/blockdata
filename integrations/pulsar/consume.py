from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\Consume.java
# WARNING: Unresolved types: ConsumerBuilder, Exception, PulsarClient, SubscriptionInitialPosition, SubscriptionType, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.pulsar.abstract_reader import AbstractReader
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.amqp.models.message import Message
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.pulsar.subscription_interface import SubscriptionInterface


@dataclass(slots=True, kw_only=True)
class Consume(AbstractReader):
    """Consume messages from Pulsar topics"""
    initial_position: Property[SubscriptionInitialPosition] = Property.ofValue(SubscriptionInitialPosition.Earliest)
    subscription_type: Property[SubscriptionType] = Property.ofValue(SubscriptionType.Exclusive)
    subscription_name: Property[str] | None = None
    consumer_properties: Property[dict[str, str]] | None = None
    encryption_key: Property[str] | None = None
    consumer_name: Property[str] | None = None

    def run(self, run_context: RunContext) -> AbstractReader.Output:
        raise NotImplementedError  # TODO: translate from Java

    def new_consumer_builder(self, run_context: RunContext, client: PulsarClient) -> ConsumerBuilder[list[int]]:
        raise NotImplementedError  # TODO: translate from Java

    def build_message(self, message: Message[list[int]], run_context: RunContext) -> PulsarMessage:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PulsarMessage:
        key: str | None = None
        value: Any | None = None
        properties: dict[str, str] | None = None
        topic: str | None = None
        event_time: datetime | None = None
        message_id: str | None = None
