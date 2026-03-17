from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractRedisConnection, RunnableTask):
    """Delete Redis JSON keys or paths"""
    keys: Property[dict[String, List[String]]]
    failed_on_missing: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int | None = None
