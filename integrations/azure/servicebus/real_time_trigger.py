from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\servicebus\RealTimeTrigger.java
# WARNING: Unresolved types: Exception, Flux, ServiceBusReceiveMode, SubQueue

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from integrations.amqp.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealTimeTrigger(AbstractTrigger):
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    d_e_f_a_u_l_t__r_e_c_e_i_v_e__m_o_d_e: ClassVar[ServiceBusReceiveMode] = ServiceBusReceiveMode.PEEK_LOCK
    queue_name: Property[str] | None = None
    topic_name: Property[str] | None = None
    connection_string: Property[str] | None = None
    subscription_name: Property[str] | None = None
    receive_mode: Property[ServiceBusReceiveMode] | None = None
    sub_queue: Property[SubQueue] | None = None
    tenant_id: Property[str] | None = None
    client_id: Property[str] | None = None
    client_secret: Property[str] | None = None
    pem_certificate: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Flux[Execution]:
        raise NotImplementedError  # TODO: translate from Java
