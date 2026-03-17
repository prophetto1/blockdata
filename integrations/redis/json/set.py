from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Set(AbstractRedisConnection, RunnableTask):
    """Write JSON value to a Redis key"""
    key: Property[str]
    value: Property[Any]
    options: Options | None = None
    get: Property[bool] | None = None
    path: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        old_value: Any | None = None

    @dataclass(slots=True)
    class Options:
        must_not_exist: Property[bool] | None = None
        must_exist: Property[bool] | None = None

        def as_redis_set(self, run_context: RunContext) -> JsonSetArgs:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    old_value: Any | None = None


@dataclass(slots=True, kw_only=True)
class Options:
    must_not_exist: Property[bool] | None = None
    must_exist: Property[bool] | None = None

    def as_redis_set(self, run_context: RunContext) -> JsonSetArgs:
        raise NotImplementedError  # TODO: translate from Java
