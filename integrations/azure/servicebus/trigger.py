from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\servicebus\Trigger.java
# WARNING: Unresolved types: Exception, ServiceBusReceiveMode, SubQueue

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from engine.core.models.executions.execution import Execution
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.amqp.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Poll Azure Service Bus for messages"""
    max_receive_duration: Property[timedelta]
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    interval: timedelta = Duration.ofSeconds(60)
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
    max_messages: Property[int] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
