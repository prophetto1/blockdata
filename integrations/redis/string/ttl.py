from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Ttl(AbstractRedisConnection, RunnableTask):
    """Read TTL for a Redis key"""
    key: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        ttl: int | None = None
        key: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    ttl: int | None = None
    key: str | None = None
