from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.pulsar.abstract_pulsar_connection import AbstractPulsarConnection
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.solace.consume import Consume
from engine.core.models.executions.execution import Execution
from engine.core.models.property.property import Property
from integrations.pulsar.pulsar_connection_interface import PulsarConnectionInterface
from integrations.pulsar.read_interface import ReadInterface
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from engine.core.docs.schema_type import SchemaType
from integrations.redis.models.serde_type import SerdeType
from integrations.pulsar.subscription_interface import SubscriptionInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger, RealtimeTriggerInterface, TriggerOutput, PulsarConnectionInterface, SubscriptionInterface, ReadInterface):
    """Trigger a flow for each Pulsar message"""
    d_e_f_a_u_l_t__r_e_c_e_i_v_e__t_i_m_e_o_u_t: int | None = None
    uri: Property[str] | None = None
    authentication_token: Property[str] | None = None
    tls_options: AbstractPulsarConnection | None = None
    topic: Any | None = None
    deserializer: Property[SerdeType] | None = None
    subscription_name: Property[str] | None = None
    initial_position: Property[SubscriptionInitialPosition] | None = None
    subscription_type: Property[SubscriptionType] | None = None
    consumer_properties: Property[dict[String, String]] | None = None
    encryption_key: Property[str] | None = None
    consumer_name: Property[str] | None = None
    schema_string: Property[str] | None = None
    schema_type: Property[SchemaType] | None = None
    is_active: AtomicBoolean | None = None
    wait_for_termination: CountDownLatch | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def publisher(self, task: Consume, run_context: RunContext) -> Publisher[Consume]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
