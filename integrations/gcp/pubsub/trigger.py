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
from integrations.gcp.pubsub.pub_sub_connection_interface import PubSubConnectionInterface
from integrations.redis.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, PubSubConnectionInterface):
    """Trigger on periodic Pub/Sub pulls"""
    project_id: Property[str] | None = None
    service_account: Property[str] | None = None
    impersonated_service_account: Property[str] | None = None
    scopes: Property[list[String]] | None = None
    topic: Property[str] | None = None
    subscription: Property[str] | None = None
    auto_create_subscription: Property[bool] | None = None
    interval: timedelta | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    serde_type: Property[SerdeType]

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
