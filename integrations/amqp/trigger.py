from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\Trigger.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from integrations.amqp.amqp_connection_interface import AmqpConnectionInterface
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from integrations.amqp.consume_interface import ConsumeInterface
from engine.core.models.executions.execution import Execution
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.amqp.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Poll AMQP queue into batch executions"""
    host: Property[str]
    interval: timedelta = Duration.ofSeconds(60)
    port: Property[str] = Property.ofValue("5672")
    virtual_host: Property[str] = Property.ofValue("/")
    consumer_tag: Property[str] = Property.ofValue("Kestra")
    auto_ack: Property[bool] = Property.ofValue(false)
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    url: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    queue: Property[str] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
