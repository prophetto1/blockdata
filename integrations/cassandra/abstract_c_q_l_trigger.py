from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cassandra\src\main\java\io\kestra\plugin\cassandra\AbstractCQLTrigger.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Optional

from integrations.cassandra.abstract_query import AbstractQuery
from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.cassandra.query_interface import QueryInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class AbstractCQLTrigger(ABC, AbstractTrigger):
    cql: Property[str]
    interval: timedelta = Duration.ofSeconds(60)
    store: Property[bool] = Property.ofValue(false)
    fetch_one: Property[bool] = Property.ofValue(false)
    fetch: Property[bool] = Property.ofValue(false)
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.NONE)
    additional_vars: dict[str, Any] = field(default_factory=dict)
    time_zone_id: str | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def run_query(self, run_context: RunContext) -> AbstractQuery.Output:
        ...
