from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\list\Trigger.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.redis.list.list_pop import ListPop
from integrations.redis.list.list_pop_interface import ListPopInterface
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.redis.redis_connection_interface import RedisConnectionInterface
from integrations.amqp.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Batch trigger from a Redis list"""
    count: Property[int] = Property.ofValue(100)
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    interval: timedelta = Duration.ofSeconds(60)
    url: Property[str] | None = None
    key: Property[str] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
