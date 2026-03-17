from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\Trigger.java
# WARNING: Unresolved types: Exception, java, util

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.aws.athena.query import Query
from integrations.cassandra.query_interface import QueryInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger on BigQuery query results"""
    interval: timedelta = Duration.ofSeconds(60)
    scopes: Property[java.util.List[str]] = Property.ofValue(Collections.singletonList("https://www.googleapis.com/auth/cloud-platform"))
    legacy_sql: Property[bool] = Property.ofValue(false)
    fetch: bool = False
    store: bool = False
    fetch_one: bool = False
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.NONE)
    project_id: Property[str] | None = None
    service_account: Property[str] | None = None
    sql: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
