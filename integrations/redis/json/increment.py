from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\json\Increment.java
# WARNING: Unresolved types: Exception, Number, RedisFactory, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Increment(AbstractRedisConnection):
    """Increment a Redis JSON number"""
    key: Property[str]
    path: Property[str]
    amount: Property[Number] = Property.ofValue(1)
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
    class Output:
        value: Number | None = None
        key: str | None = None
