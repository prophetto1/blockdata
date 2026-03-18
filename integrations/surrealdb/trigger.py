from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-surrealdb\src\main\java\io\kestra\plugin\surrealdb\Trigger.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.cassandra.query_interface import QueryInterface
from integrations.surrealdb.surreal_d_b_connection_interface import SurrealDBConnectionInterface
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger Flow when SurrealDB query returns rows"""
    host: str
    namespace: str
    database: str
    query: str
    use_tls: Property[bool] = Property.ofValue(false)
    port: int = 8000
    connection_timeout: int = 60
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.STORE)
    parameters: Property[dict[str, str]] = Property.ofValue(new HashMap<>())
    interval: timedelta = Duration.ofMinutes(1)
    username: Property[str] | None = None
    password: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
