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
from integrations.surrealdb.query_interface import QueryInterface
from integrations.surrealdb.surreal_d_b_connection_interface import SurrealDBConnectionInterface
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, SurrealDBConnectionInterface, QueryInterface):
    """Trigger Flow when SurrealDB query returns rows"""
    use_tls: Property[bool] | None = None
    port: int = 8000
    host: str | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    namespace: str | None = None
    database: str | None = None
    connection_timeout: int = 60
    fetch_type: Property[FetchType]
    parameters: Property[dict[String, String]] | None = None
    query: str | None = None
    interval: timedelta | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
