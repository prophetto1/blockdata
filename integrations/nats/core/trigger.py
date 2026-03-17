from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.solace.consume import Consume
from integrations.nats.consume_interface import ConsumeInterface
from engine.core.models.executions.execution import Execution
from integrations.nats.core.nats_connection_interface import NatsConnectionInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.nats.core.subscribe_interface import SubscribeInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, NatsConnectionInterface, ConsumeInterface, SubscribeInterface):
    """Trigger on polled NATS messages"""
    url: str | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    token: Property[str] | None = None
    creds: Property[str] | None = None
    subject: str | None = None
    durable_id: Property[str] | None = None
    since: Property[str] | None = None
    poll_duration: Property[timedelta] | None = None
    batch_size: int = 10
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    deliver_policy: Property[DeliverPolicy] | None = None
    interval: timedelta | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
