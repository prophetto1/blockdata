from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-nats\src\main\java\io\kestra\plugin\nats\core\Trigger.java
# WARNING: Unresolved types: DeliverPolicy, Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from integrations.amqp.consume_interface import ConsumeInterface
from engine.core.models.executions.execution import Execution
from integrations.nats.core.nats_connection_interface import NatsConnectionInterface
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.mqtt.subscribe_interface import SubscribeInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger on polled NATS messages"""
    poll_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(2))
    batch_size: int = 10
    deliver_policy: Property[DeliverPolicy] = Property.ofValue(DeliverPolicy.All)
    interval: timedelta = Duration.ofSeconds(60)
    url: str | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    token: Property[str] | None = None
    creds: Property[str] | None = None
    subject: str | None = None
    durable_id: Property[str] | None = None
    since: Property[str] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
