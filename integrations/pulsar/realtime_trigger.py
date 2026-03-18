from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, CountDownLatch, Exception, Publisher, PulsarMessage, SubscriptionInitialPosition, SubscriptionType, TlsOptions

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.pulsar.abstract_pulsar_connection import AbstractPulsarConnection
from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from engine.core.models.executions.execution import Execution
from engine.core.models.property.property import Property
from integrations.pulsar.pulsar_connection_interface import PulsarConnectionInterface
from integrations.pulsar.read_interface import ReadInterface
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.pulsar.schema_type import SchemaType
from integrations.amqp.models.serde_type import SerdeType
from integrations.pulsar.subscription_interface import SubscriptionInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Trigger a flow for each Pulsar message"""
    d_e_f_a_u_l_t__r_e_c_e_i_v_e__t_i_m_e_o_u_t: ClassVar[int] = 500
    deserializer: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    initial_position: Property[SubscriptionInitialPosition] = Property.ofValue(SubscriptionInitialPosition.Earliest)
    subscription_type: Property[SubscriptionType] = Property.ofValue(SubscriptionType.Exclusive)
    schema_type: Property[SchemaType] = Property.ofValue(SchemaType.NONE)
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    uri: Property[str] | None = None
    authentication_token: Property[str] | None = None
    tls_options: AbstractPulsarConnection.TlsOptions | None = None
    topic: Any | None = None
    subscription_name: Property[str] | None = None
    consumer_properties: Property[dict[str, str]] | None = None
    encryption_key: Property[str] | None = None
    consumer_name: Property[str] | None = None
    schema_string: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def publisher(self, task: Consume, run_context: RunContext) -> Publisher[Consume.PulsarMessage]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
