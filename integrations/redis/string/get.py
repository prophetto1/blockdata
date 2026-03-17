from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Get(AbstractRedisConnection, RunnableTask):
    """Read a Redis string value"""
    key: Property[str]
    serde_type: Property[SerdeType]
    failed_on_missing: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        data: Any | None = None
        key: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    data: Any | None = None
    key: str | None = None
