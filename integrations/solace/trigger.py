from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.solace.consume import Consume
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.solace.service.receiver.queue_types import QueueTypes
from integrations.solace.serde.serdes import Serdes
from integrations.solace.solace_consume_interface import SolaceConsumeInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, SolaceConsumeInterface, PollingTriggerInterface, TriggerOutput):
    """Trigger flow from Solace queue"""
    interval: timedelta | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    vpn: Property[str] | None = None
    host: Property[str] | None = None
    properties: Property[dict[String, String]] | None = None
    queue_name: Property[str] | None = None
    queue_type: Property[QueueTypes] | None = None
    message_deserializer: Property[Serdes] | None = None
    message_deserializer_properties: Property[dict[String, Object]] | None = None
    max_messages: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    message_selector: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
