from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class ListPush(AbstractRedisConnection, RunnableTask):
    """Push values to a Redis list"""
    key: Property[str]
    from: Any
    serde_type: Property[SerdeType]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_flowable(self, flowable: Flux[Object], run_context: RunContext, factory: RedisFactory) -> Flux[Integer]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int | None = None
