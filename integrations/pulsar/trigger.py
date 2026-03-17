from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.pulsar.abstract_pulsar_connection import AbstractPulsarConnection
from integrations.pulsar.abstract_reader import AbstractReader
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.pulsar.polling_interface import PollingInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.pulsar.pulsar_connection_interface import PulsarConnectionInterface
from integrations.pulsar.read_interface import ReadInterface
from engine.core.docs.schema_type import SchemaType
from integrations.redis.models.serde_type import SerdeType
from integrations.pulsar.subscription_interface import SubscriptionInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, PulsarConnectionInterface, SubscriptionInterface, ReadInterface, PollingInterface):
    """Trigger a flow by polling Pulsar messages"""
    interval: timedelta | None = None
    uri: Property[str] | None = None
    authentication_token: Property[str] | None = None
    tls_options: AbstractPulsarConnection | None = None
    topic: Any | None = None
    deserializer: Property[SerdeType] | None = None
    poll_duration: Property[timedelta] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    subscription_name: Property[str] | None = None
    initial_position: Property[SubscriptionInitialPosition] | None = None
    subscription_type: Property[SubscriptionType] | None = None
    consumer_properties: Property[dict[String, String]] | None = None
    encryption_key: Property[str] | None = None
    consumer_name: Property[str] | None = None
    schema_string: Property[str] | None = None
    schema_type: Property[SchemaType] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
