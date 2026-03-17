from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\list\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, CountDownLatch, Publisher, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.redis.list.list_pop import ListPop
from integrations.redis.list.list_pop_base_interface import ListPopBaseInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from integrations.redis.redis_connection_interface import RedisConnectionInterface
from engine.core.runners.run_context import RunContext
from integrations.amqp.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Realtime trigger from a Redis list"""
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    url: Property[str] | None = None
    key: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def publisher(self, task: ListPop, run_context: RunContext) -> Publisher[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        value: Any | None = None
