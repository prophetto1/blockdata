from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.influxdb.abstract_query import AbstractQuery
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.surrealdb.query_interface import QueryInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class AbstractCQLTrigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, QueryInterface):
    interval: timedelta | None = None
    time_zone_id: str | None = None
    cql: Property[str]
    store: Property[bool] | None = None
    fetch_one: Property[bool] | None = None
    fetch: Property[bool] | None = None
    fetch_type: Property[FetchType] | None = None
    additional_vars: dict[String, Object] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def run_query(self, run_context: RunContext) -> AbstractQuery:
        raise NotImplementedError  # TODO: translate from Java
