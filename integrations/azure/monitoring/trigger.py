from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\monitoring\Trigger.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.aws.athena.query import Query
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger flows from Azure Monitor metrics"""
    endpoint: Property[str]
    interval: timedelta = Duration.ofSeconds(60)
    window: Property[timedelta] = Property.ofValue(Duration.ofMinutes(5))
    tenant_id: Property[str] | None = None
    client_id: Property[str] | None = None
    client_secret: Property[str] | None = None
    subscription_id: Property[str] | None = None
    resource_ids: Property[list[str]] | None = None
    metric_names: Property[list[str]] | None = None
    metrics_namespace: Property[str] | None = None
    aggregations: Property[list[str]] | None = None
    granularity: Property[timedelta] | None = None
    filter: Property[str] | None = None
    top: Property[int] | None = None
    order_by: Property[str] | None = None
    rollup_by: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
