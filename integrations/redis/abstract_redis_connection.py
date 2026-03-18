from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-redis\src\main\java\io\kestra\plugin\redis\AbstractRedisConnection.java
# WARNING: Unresolved types: AutoCloseable, Exception, RedisClient, RedisCommands, StatefulRedisConnection

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from integrations.redis.redis_connection_interface import RedisConnectionInterface
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractRedisConnection(ABC, Task):
    url: Property[str] | None = None

    def redis_factory(self, run_context: RunContext) -> RedisFactory:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class RedisFactory:
        redis_client: RedisClient | None = None
        redis_connection: StatefulRedisConnection[str, str] | None = None
        sync_commands: RedisCommands[str, str] | None = None

        def connect(self, run_context: RunContext) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def close(self) -> None:
            raise NotImplementedError  # TODO: translate from Java
