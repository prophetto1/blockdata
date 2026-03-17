from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.weaviate.query import Query
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput):
    """Trigger flows from Azure Monitor metrics"""
    tenant_id: Property[str] | None = None
    client_id: Property[str] | None = None
    client_secret: Property[str] | None = None
    subscription_id: Property[str] | None = None
    endpoint: Property[str]
    interval: timedelta | None = None
    resource_ids: Property[list[String]] | None = None
    metric_names: Property[list[String]] | None = None
    metrics_namespace: Property[str] | None = None
    window: Property[timedelta] | None = None
    aggregations: Property[list[String]] | None = None
    granularity: Property[timedelta] | None = None
    filter: Property[str] | None = None
    top: Property[int] | None = None
    order_by: Property[str] | None = None
    rollup_by: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
