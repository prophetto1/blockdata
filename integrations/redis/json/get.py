from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\json\Get.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractRedisConnection):
    """Read JSON value from Redis key"""
    key: Property[str]
    failed_on_missing: Property[bool] = Property.ofValue(false)
    path: Property[str] = Property.ofValue("$")

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        data: Any | None = None
        key: str | None = None
