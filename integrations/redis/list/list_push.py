from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\list\ListPush.java
# WARNING: Unresolved types: Exception, Flux, RedisFactory, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class ListPush(AbstractRedisConnection):
    """Push values to a Redis list"""
    key: Property[str]
    from: Any
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_flowable(self, flowable: Flux[Any], run_context: RunContext, factory: RedisFactory) -> Flux[int]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
