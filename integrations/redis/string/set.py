from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Set(AbstractRedisConnection, RunnableTask):
    """Write a string value to Redis"""
    key: Property[str]
    value: Property[Any]
    options: Options | None = None
    get: Property[bool] | None = None
    serde_type: Property[SerdeType]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        old_value: str | None = None

    @dataclass(slots=True)
    class Options:
        expiration_duration: Property[timedelta] | None = None
        expiration_date: Property[datetime] | None = None
        must_not_exist: Property[bool] | None = None
        must_exist: Property[bool] | None = None
        keep_ttl: Property[bool] | None = None

        def as_redis_set(self, run_context: RunContext) -> SetArgs:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    old_value: str | None = None


@dataclass(slots=True, kw_only=True)
class Options:
    expiration_duration: Property[timedelta] | None = None
    expiration_date: Property[datetime] | None = None
    must_not_exist: Property[bool] | None = None
    must_exist: Property[bool] | None = None
    keep_ttl: Property[bool] | None = None

    def as_redis_set(self, run_context: RunContext) -> SetArgs:
        raise NotImplementedError  # TODO: translate from Java
