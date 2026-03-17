from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\Trigger.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.mongodb.find import Find
from integrations.mongodb.mongo_db_connection import MongoDbConnection
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Poll MongoDB and trigger on results"""
    interval: timedelta = Duration.ofSeconds(60)
    store: Property[bool] = Property.ofValue(false)
    connection: MongoDbConnection | None = None
    database: Property[str] | None = None
    collection: Property[str] | None = None
    filter: Any | None = None
    projection: Any | None = None
    sort: Any | None = None
    limit: Property[int] | None = None
    skip: Property[int] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
