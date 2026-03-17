from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from integrations.amqp.amqp_connection_interface import AmqpConnectionInterface
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.solace.consume import Consume
from integrations.nats.consume_interface import ConsumeInterface
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.redis.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, ConsumeInterface, AmqpConnectionInterface):
    """Poll AMQP queue into batch executions"""
    interval: timedelta | None = None
    url: Property[str] | None = None
    host: Property[str]
    port: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    virtual_host: Property[str] | None = None
    queue: Property[str] | None = None
    consumer_tag: Property[str] | None = None
    auto_ack: Property[bool] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    serde_type: Property[SerdeType] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
