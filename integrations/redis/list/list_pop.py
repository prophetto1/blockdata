from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\list\ListPop.java
# WARNING: Unresolved types: AtomicInteger, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.redis.abstract_redis_connection import AbstractRedisConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.redis.list.list_pop_interface import ListPopInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.amqp.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class ListPop(AbstractRedisConnection):
    """Pop elements from a Redis list"""
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    count: Property[int] = Property.ofValue(100)
    key: Property[str] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def ended(self, run_context: RunContext, empty: bool, count: AtomicInteger, start: datetime) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        count: int | None = None
        uri: str | None = None
