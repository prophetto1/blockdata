from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\string\Set.java
# WARNING: Unresolved types: Exception, SetArgs, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class Set(AbstractRedisConnection):
    """Write a string value to Redis"""
    key: Property[str]
    value: Property[Any]
    options: Options = Options.builder().build()
    get: Property[bool] = Property.ofValue(false)
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        old_value: str | None = None

    @dataclass(slots=True)
    class Options:
        must_not_exist: Property[bool] = Property.ofValue(false)
        must_exist: Property[bool] = Property.ofValue(false)
        keep_ttl: Property[bool] = Property.ofValue(false)
        expiration_duration: Property[timedelta] | None = None
        expiration_date: Property[datetime] | None = None

        def as_redis_set(self, run_context: RunContext) -> SetArgs:
            raise NotImplementedError  # TODO: translate from Java
