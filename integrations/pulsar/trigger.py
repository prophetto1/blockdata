from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\Trigger.java
# WARNING: Unresolved types: Exception, SubscriptionInitialPosition, SubscriptionType, TlsOptions

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.pulsar.abstract_pulsar_connection import AbstractPulsarConnection
from integrations.pulsar.abstract_reader import AbstractReader
from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.aws.glue.model.output import Output
from integrations.pulsar.polling_interface import PollingInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.pulsar.pulsar_connection_interface import PulsarConnectionInterface
from integrations.pulsar.read_interface import ReadInterface
from integrations.pulsar.schema_type import SchemaType
from integrations.amqp.models.serde_type import SerdeType
from integrations.pulsar.subscription_interface import SubscriptionInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger a flow by polling Pulsar messages"""
    interval: timedelta = Duration.ofSeconds(60)
    deserializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    poll_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(2))
    initial_position: Property[SubscriptionInitialPosition] = Property.ofValue(SubscriptionInitialPosition.Earliest)
    subscription_type: Property[SubscriptionType] = Property.ofValue(SubscriptionType.Exclusive)
    schema_type: Property[SchemaType] = Property.ofValue(SchemaType.NONE)
    uri: Property[str] | None = None
    authentication_token: Property[str] | None = None
    tls_options: AbstractPulsarConnection.TlsOptions | None = None
    topic: Any | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    subscription_name: Property[str] | None = None
    consumer_properties: Property[dict[str, str]] | None = None
    encryption_key: Property[str] | None = None
    consumer_name: Property[str] | None = None
    schema_string: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
