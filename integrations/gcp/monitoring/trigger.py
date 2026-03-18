from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\monitoring\Trigger.java
# WARNING: Unresolved types: Exception, java, util

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
    """Trigger on Cloud Monitoring results"""
    filter: Property[str]
    interval: timedelta = Duration.ofSeconds(60)
    scopes: Property[java.util.List[str]] = Property.ofValue(Collections.singletonList("https://www.googleapis.com/auth/cloud-platform"))
    window: Property[timedelta] = Property.ofValue(Duration.ofMinutes(5))
    project_id: Property[str] | None = None
    service_account: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
