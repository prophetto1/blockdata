from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.weaviate.query import Query
from integrations.surrealdb.query_interface import QueryInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, QueryInterface):
    """Trigger on BigQuery query results"""
    interval: timedelta | None = None
    project_id: Property[str] | None = None
    service_account: Property[str] | None = None
    scopes: Property[java] | None = None
    sql: Property[str] | None = None
    legacy_sql: Property[bool] | None = None
    fetch: bool = False
    store: bool = False
    fetch_one: bool = False
    fetch_type: Property[FetchType] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
