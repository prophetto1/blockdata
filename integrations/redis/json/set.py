from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\json\Set.java
# WARNING: Unresolved types: Exception, JsonSetArgs, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Set(AbstractRedisConnection):
    """Write JSON value to a Redis key"""
    key: Property[str]
    value: Property[Any]
    options: Options = Options.builder().build()
    get: Property[bool] = Property.ofValue(false)
    path: Property[str] = Property.ofValue("$")

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        old_value: Any | None = None

    @dataclass(slots=True)
    class Options:
        must_not_exist: Property[bool] = Property.ofValue(false)
        must_exist: Property[bool] = Property.ofValue(false)

        def as_redis_set(self, run_context: RunContext) -> JsonSetArgs:
            raise NotImplementedError  # TODO: translate from Java
