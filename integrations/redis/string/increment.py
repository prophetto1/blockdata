from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Increment(AbstractRedisConnection, RunnableTask):
    """Increment a Redis string number"""
    key: Property[str]
    amount: Property[Number] | None = None
    options: Options | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Options:
        expiration_duration: Property[timedelta] | None = None
        expiration_date: Property[datetime] | None = None

        def apply_expiration(self, run_context: RunContext, factory: RedisFactory, key: str) -> None:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        value: Number | None = None
        key: str | None = None


@dataclass(slots=True, kw_only=True)
class Options:
    expiration_duration: Property[timedelta] | None = None
    expiration_date: Property[datetime] | None = None

    def apply_expiration(self, run_context: RunContext, factory: RedisFactory, key: str) -> None:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    value: Number | None = None
    key: str | None = None
