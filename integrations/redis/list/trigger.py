from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.redis.list.list_pop import ListPop
from integrations.redis.list.list_pop_interface import ListPopInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.redis.redis_connection_interface import RedisConnectionInterface
from integrations.redis.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, ListPopInterface, RedisConnectionInterface):
    """Batch trigger from a Redis list"""
    url: Property[str] | None = None
    key: Property[str] | None = None
    count: Property[int] | None = None
    serde_type: Property[SerdeType]
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    interval: timedelta | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
